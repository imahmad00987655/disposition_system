<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Authentication check - Only allow Rizwan Manager (code: 48, username: rizwan, password: hello)
    $username = $_GET['username'] ?? $_POST['username'] ?? '';
    $password = $_GET['password'] ?? $_POST['password'] ?? '';
    $userCode = $_GET['code'] ?? $_POST['code'] ?? '';
    
    // Normalize inputs
    $username = strtolower(trim($username));
    $password = trim($password);
    $userCode = trim((string)$userCode);
    
    // Check authentication - Only Rizwan Manager (code: 48, LoginName: rizwan, LoginPassword: hello)
    $isAuthorized = false;
    
    // Primary check: code 48 with password hello
    if (($userCode === '48' || $userCode === 48) && $password === 'hello') {
        $isAuthorized = true;
    }
    
    // Secondary check: username rizwan with password hello
    if (!$isAuthorized && $username === 'rizwan' && $password === 'hello') {
        $isAuthorized = true;
    }
    
    // Tertiary check: Verify from SQL Server database
    if (!$isAuthorized && ($userCode === '48' || $userCode === 48 || $username === 'rizwan')) {
        try {
            $sqlServerConn = new PDO("sqlsrv:Server=192.168.1.6,1433;Database=Rizwan;TrustServerCertificate=yes", "Rizwan", "cs786");
            $sqlServerConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Check by code
            if ($userCode === '48' || $userCode === 48) {
                $userSql = "SELECT code, FullName, LoginName, LoginPassword 
                           FROM [Rizwan].[dbo].[vwUsers] 
                           WHERE code = :code AND LoginPassword = :password";
                $userStmt = $sqlServerConn->prepare($userSql);
                $codeForDb = (string)$userCode;
                $userStmt->bindParam(':code', $codeForDb);
                $userStmt->bindParam(':password', $password);
                $userStmt->execute();
                $userRow = $userStmt->fetch(PDO::FETCH_OBJ);
                
                if ($userRow && strtolower($userRow->LoginName) === 'rizwan' && $password === 'hello') {
                    $isAuthorized = true;
                }
            }
            
            // Check by username if code check didn't work
            if (!$isAuthorized && $username === 'rizwan') {
                $userSql = "SELECT code, FullName, LoginName, LoginPassword 
                           FROM [Rizwan].[dbo].[vwUsers] 
                           WHERE LoginName = :username AND LoginPassword = :password";
                $userStmt = $sqlServerConn->prepare($userSql);
                $userStmt->bindParam(':username', $username);
                $userStmt->bindParam(':password', $password);
                $userStmt->execute();
                $userRow = $userStmt->fetch(PDO::FETCH_OBJ);
                
                if ($userRow && $userRow->code == 48 && $password === 'hello') {
                    $isAuthorized = true;
                }
            }
        } catch (Exception $e) {
            // SQL Server check failed - rely on primary/secondary checks
        }
    }
    
    if (!$isAuthorized) {
        echo json_encode([
            'status' => 'error',
            'error' => 'Unauthorized access. This dashboard is only available for Rizwan Manager (code: 48).'
        ]);
        exit;
    }
    
    $dateRange = $_GET['date_range'] ?? 'today'; // today, week, month
    $agentFilter = $_GET['agent'] ?? null; // Filter by specific agent
    
    // Connect to MySQL
    $mysqlHost = '192.168.1.209';
    $mysqlDb = 'callback2';
    $mysqlUser = 'root';
    $mysqlPass = 'Pakistan92';
    
    $mysqlConn = new PDO("mysql:host=$mysqlHost;dbname=$mysqlDb;charset=utf8mb4", $mysqlUser, $mysqlPass);
    $mysqlConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Calculate date range
    $today = date('Y-m-d');
    $startDate = $today;
    $endDate = $today;
    
    if ($dateRange === 'week') {
        $startDate = date('Y-m-d', strtotime('-7 days'));
    } elseif ($dateRange === 'month') {
        $startDate = date('Y-m-d', strtotime('-30 days'));
    }
    
    // Get all agents from comments table
    $agentSql = "SELECT DISTINCT agent_name 
                 FROM comments 
                 WHERE comment_date BETWEEN :start_date AND :end_date
                 AND agent_name IS NOT NULL AND agent_name != ''
                 ORDER BY agent_name ASC";
    
    if ($agentFilter) {
        $agentSql = "SELECT DISTINCT agent_name 
                     FROM comments 
                     WHERE agent_name = :agent_filter
                     AND comment_date BETWEEN :start_date AND :end_date
                     ORDER BY agent_name ASC";
    }
    
    $agentStmt = $mysqlConn->prepare($agentSql);
    $agentStmt->bindParam(':start_date', $startDate);
    $agentStmt->bindParam(':end_date', $endDate);
    if ($agentFilter) {
        $agentStmt->bindParam(':agent_filter', $agentFilter);
    }
    $agentStmt->execute();
    
    $agents = [];
    while ($row = $agentStmt->fetch(PDO::FETCH_OBJ)) {
        $agents[] = $row->agent_name;
    }
    
    // Connect to callbackreminder database for new_customer table (once, outside loop)
    $callbackreminderConn = new PDO("mysql:host=$mysqlHost;dbname=callbackreminder;charset=utf8mb4", $mysqlUser, $mysqlPass);
    $callbackreminderConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get statistics for each agent
    $agentStats = [];
    $totalComplaints = 0;
    $totalComments = 0;
    $totalCustomers = 0;
    $totalDDS = 0;
    $totalOrders = 0;
    
    foreach ($agents as $agent) {
        // Count comments by this agent
        $commentSql = "SELECT COUNT(*) as count, 
                              COUNT(DISTINCT complaint_id) as unique_complaints
                       FROM comments 
                       WHERE agent_name = :agent_name 
                       AND comment_date BETWEEN :start_date AND :end_date
                       AND comment_type != 'Auto'";
        
        $commentStmt = $mysqlConn->prepare($commentSql);
        $commentStmt->bindParam(':agent_name', $agent);
        $commentStmt->bindParam(':start_date', $startDate);
        $commentStmt->bindParam(':end_date', $endDate);
        $commentStmt->execute();
        $commentResult = $commentStmt->fetch(PDO::FETCH_OBJ);
        
        $commentsCount = (int)$commentResult->count;
        $uniqueComplaints = (int)$commentResult->unique_complaints;
        
        // Count new customers registered by this agent
        $customerSql = "SELECT COUNT(*) as count 
                        FROM new_customers 
                        WHERE agent_name = :agent_name 
                        AND DATE(date_added) BETWEEN :start_date AND :end_date";
        
        $customerStmt = $callbackreminderConn->prepare($customerSql);
        $customerStmt->bindParam(':agent_name', $agent);
        $customerStmt->bindParam(':start_date', $startDate);
        $customerStmt->bindParam(':end_date', $endDate);
        $customerStmt->execute();
        $customerResult = $customerStmt->fetch(PDO::FETCH_OBJ);
        $customersCount = (int)$customerResult->count;
        
        // Count DDS appointments updated by this agent (from callbackreminder database)
        $ddsSql = "SELECT COUNT(*) as count 
                   FROM dds_status_history 
                   WHERE changed_by = :agent_name 
                   AND DATE(changed_at) BETWEEN :start_date AND :end_date";
        
        $ddsStmt = $callbackreminderConn->prepare($ddsSql);
        $ddsStmt->bindParam(':agent_name', $agent);
        $ddsStmt->bindParam(':start_date', $startDate);
        $ddsStmt->bindParam(':end_date', $endDate);
        $ddsStmt->execute();
        $ddsResult = $ddsStmt->fetch(PDO::FETCH_OBJ);
        $ddsCount = (int)$ddsResult->count;
        
        // Get last activity time (combine comment_date and comment_time)
        $lastActivitySql = "SELECT MAX(CONCAT(comment_date, ' ', comment_time)) as last_activity 
                           FROM comments 
                           WHERE agent_name = :agent_name 
                           AND comment_date BETWEEN :start_date AND :end_date";
        
        $lastActivityStmt = $mysqlConn->prepare($lastActivitySql);
        $lastActivityStmt->bindParam(':agent_name', $agent);
        $lastActivityStmt->bindParam(':start_date', $startDate);
        $lastActivityStmt->bindParam(':end_date', $endDate);
        $lastActivityStmt->execute();
        $lastActivityResult = $lastActivityStmt->fetch(PDO::FETCH_OBJ);
        $lastActivity = $lastActivityResult->last_activity ?? null;
        
        $agentStats[] = [
            'agent_name' => $agent,
            'comments_count' => $commentsCount,
            'unique_complaints' => $uniqueComplaints,
            'customers_registered' => $customersCount,
            'dds_updates' => $ddsCount,
            'last_activity' => $lastActivity,
            'total_activities' => $commentsCount + $customersCount + $ddsCount
        ];
        
        $totalComplaints += $uniqueComplaints;
        $totalComments += $commentsCount;
        $totalCustomers += $customersCount;
        $totalDDS += $ddsCount;
    }
    
    // Get recent activities (last 50)
    // We need to query from multiple databases, so we'll do separate queries and combine
    $recentActivities = [];
    
    // Get complaint activities from callback2 database
    $complaintActivitiesSql = "SELECT c.complaint_id, c.comment, c.agent_name, 
                                   CONCAT(c.comment_date, ' ', c.comment_time) as timestamp, 
                                   c.comment_type,
                                   'complaint' as activity_type
                            FROM callback2.comments c
                            WHERE c.comment_date BETWEEN :start_date AND :end_date
                            AND c.comment_type != 'Auto'
                            ORDER BY c.comment_date DESC, c.comment_time DESC
                            LIMIT 30";
    
    $complaintStmt = $mysqlConn->prepare($complaintActivitiesSql);
    $complaintStmt->bindParam(':start_date', $startDate);
    $complaintStmt->bindParam(':end_date', $endDate);
    $complaintStmt->execute();
    
    while ($row = $complaintStmt->fetch(PDO::FETCH_OBJ)) {
        $recentActivities[] = [
            'id' => $row->complaint_id,
            'activity_type' => $row->activity_type,
            'comment' => $row->comment,
            'agent_name' => $row->agent_name,
            'timestamp' => $row->timestamp,
            'comment_type' => $row->comment_type
        ];
    }
    
    // Get customer activities from callbackreminder database
    $callbackreminderConn = new PDO("mysql:host=$mysqlHost;dbname=callbackreminder;charset=utf8mb4", $mysqlUser, $mysqlPass);
    $callbackreminderConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $customerActivitiesSql = "SELECT nc.id as complaint_id, 
                                   CONCAT('New customer registered: ', nc.customer_name) as comment,
                                   nc.agent_name, 
                                   CONCAT(nc.date_added, ' 00:00:00') as timestamp,
                                   'Customer Registration' as comment_type,
                                   'customer' as activity_type
                            FROM new_customers nc
                            WHERE nc.date_added BETWEEN :start_date AND :end_date
                            ORDER BY nc.date_added DESC
                            LIMIT 10";
    
    $customerStmt = $callbackreminderConn->prepare($customerActivitiesSql);
    $customerStmt->bindParam(':start_date', $startDate);
    $customerStmt->bindParam(':end_date', $endDate);
    $customerStmt->execute();
    
    while ($row = $customerStmt->fetch(PDO::FETCH_OBJ)) {
        $recentActivities[] = [
            'id' => $row->complaint_id,
            'activity_type' => $row->activity_type,
            'comment' => $row->comment,
            'agent_name' => $row->agent_name,
            'timestamp' => $row->timestamp,
            'comment_type' => $row->comment_type
        ];
    }
    
    // Get DDS activities from callbackreminder database
    $ddsActivitiesSql = "SELECT dsh.dds_id as complaint_id,
                                   CONCAT('DDS status updated: ', dsh.old_status, ' → ', dsh.new_status) as comment,
                                   dsh.changed_by as agent_name,
                                   DATE_FORMAT(dsh.changed_at, '%Y-%m-%d %H:%i:%s') as timestamp,
                                   'DDS Update' as comment_type,
                                   'dds' as activity_type
                            FROM dds_status_history dsh
                            WHERE DATE(dsh.changed_at) BETWEEN :start_date AND :end_date
                            ORDER BY dsh.changed_at DESC
                            LIMIT 10";
    
    $ddsStmt = $callbackreminderConn->prepare($ddsActivitiesSql);
    $ddsStmt->bindParam(':start_date', $startDate);
    $ddsStmt->bindParam(':end_date', $endDate);
    $ddsStmt->execute();
    
    while ($row = $ddsStmt->fetch(PDO::FETCH_OBJ)) {
        $recentActivities[] = [
            'id' => $row->complaint_id,
            'activity_type' => $row->activity_type,
            'comment' => $row->comment,
            'agent_name' => $row->agent_name,
            'timestamp' => $row->timestamp,
            'comment_type' => $row->comment_type
        ];
    }
    
    // Sort by timestamp and limit to 50
    usort($recentActivities, function($a, $b) {
        return strcmp($b['timestamp'], $a['timestamp']);
    });
    $recentActivities = array_slice($recentActivities, 0, 50);
    
    // Get daily statistics for the date range
    $dailyStatsSql = "SELECT comment_date as date, 
                             COUNT(*) as comments_count,
                             COUNT(DISTINCT complaint_id) as complaints_count,
                             COUNT(DISTINCT agent_name) as agents_count
                      FROM comments
                      WHERE comment_date BETWEEN :start_date AND :end_date
                      AND comment_type != 'Auto'
                      GROUP BY comment_date
                      ORDER BY date DESC";
    
    $dailyStmt = $mysqlConn->prepare($dailyStatsSql);
    $dailyStmt->bindParam(':start_date', $startDate);
    $dailyStmt->bindParam(':end_date', $endDate);
    $dailyStmt->execute();
    
    $dailyStats = [];
    while ($row = $dailyStmt->fetch(PDO::FETCH_OBJ)) {
        $dailyStats[] = [
            'date' => $row->date,
            'comments_count' => (int)$row->comments_count,
            'complaints_count' => (int)$row->complaints_count,
            'agents_count' => (int)$row->agents_count
        ];
    }
    
    echo json_encode([
        'status' => 'success',
        'data' => [
            'summary' => [
                'total_agents' => count($agents),
                'total_complaints' => $totalComplaints,
                'total_comments' => $totalComments,
                'total_customers' => $totalCustomers,
                'total_dds_updates' => $totalDDS,
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate,
                    'range' => $dateRange
                ]
            ],
            'agent_stats' => $agentStats,
            'recent_activities' => $recentActivities,
            'daily_stats' => $dailyStats
        ]
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'status' => 'error',
        'error' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>

