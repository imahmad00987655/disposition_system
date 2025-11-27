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
    // Get department and current user from request
    $department = $_GET['department'] ?? $_POST['department'] ?? null; // 'dds' or 'orders'
    $currentUser = $_GET['current_user'] ?? $_POST['current_user'] ?? null; // Current logged-in user's name
    
    // Connect to MySQL
    $mysqlHost = '192.168.1.209';
    $mysqlDb = 'callback2';
    $mysqlUser = 'root';
    $mysqlPass = 'Pakistan92';
    
    $mysqlConn = new PDO("mysql:host=$mysqlHost;dbname=$mysqlDb;charset=utf8mb4", $mysqlUser, $mysqlPass);
    $mysqlConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $taggedUsers = array();
    
    // If department is DDS, fetch ONLY from dds_access table
    if ($department === 'dds') {
        // Fetch users from dds_access table ONLY
        $ddsSql = "SELECT full_name FROM dds_access WHERE is_active = 1 AND full_name IS NOT NULL AND full_name != ''";
        if ($currentUser) {
            $ddsSql .= " AND full_name != :current_user";
        }
        $ddsSql .= " ORDER BY full_name ASC";
        
        $ddsStmt = $mysqlConn->prepare($ddsSql);
        if ($currentUser) {
            $ddsStmt->bindParam(':current_user', $currentUser);
        }
        $ddsStmt->execute();
        
        while ($row = $ddsStmt->fetch(PDO::FETCH_OBJ)) {
            $taggedUsers[] = array(
                'code' => $row->full_name,
                'fullName' => $row->full_name
            );
        }
    } 
    // If department is Orders, fetch ONLY from orders_access table
    elseif ($department === 'orders') {
        // Fetch users from orders_access table ONLY
        $ordersSql = "SELECT full_name FROM orders_access WHERE is_active = 1 AND full_name IS NOT NULL AND full_name != ''";
        if ($currentUser) {
            $ordersSql .= " AND full_name != :current_user";
        }
        $ordersSql .= " ORDER BY full_name ASC";
        
        $ordersStmt = $mysqlConn->prepare($ordersSql);
        if ($currentUser) {
            $ordersStmt->bindParam(':current_user', $currentUser);
        }
        $ordersStmt->execute();
        
        while ($row = $ordersStmt->fetch(PDO::FETCH_OBJ)) {
            $taggedUsers[] = array(
                'code' => $row->full_name,
                'fullName' => $row->full_name
            );
        }
    }
    // If no department specified, fetch from SQL Server (for Complaints module)
    else {
        // Get tagged user codes from MySQL tagged_users table
        $mysqlSql = "SELECT user_code FROM tagged_users WHERE is_active = 1 ORDER BY display_order ASC";
        $mysqlStmt = $mysqlConn->prepare($mysqlSql);
        $mysqlStmt->execute();
        
        $taggedUserCodes = array();
        while ($row = $mysqlStmt->fetch(PDO::FETCH_OBJ)) {
            $taggedUserCodes[] = $row->user_code;
        }
        
        // Connect to SQL Server to get full names for the tagged user codes
        if (!empty($taggedUserCodes)) {
            $sqlServerConn = new PDO("sqlsrv:Server=192.168.1.6,1433;Database=Rizwan;TrustServerCertificate=yes", "Rizwan", "cs786");
            $sqlServerConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Build IN clause with placeholders for security
            $placeholders = str_repeat('?,', count($taggedUserCodes) - 1) . '?';
            $sqlServerSql = "SELECT code, FullName FROM [Rizwan].[dbo].[vwUsers] WHERE code IN ($placeholders)";
            $sqlServerStmt = $sqlServerConn->prepare($sqlServerSql);
            $sqlServerStmt->execute($taggedUserCodes);
            
            // Add SQL Server users to taggedUsers array, excluding current user
            while ($row = $sqlServerStmt->fetch(PDO::FETCH_OBJ)) {
                // Exclude current user if provided
                if ($currentUser && $row->FullName === $currentUser) {
                    continue;
                }
                
                $taggedUsers[] = array(
                    'code' => $row->code,
                    'fullName' => $row->FullName
                );
            }
        }
    }
    
    // Sort by fullName for consistent ordering
    usort($taggedUsers, function($a, $b) {
        return strcmp($a['fullName'], $b['fullName']);
    });
    
    echo json_encode([
        'status' => 'success',
        'taggedUsers' => $taggedUsers
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
