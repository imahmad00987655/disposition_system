<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$host = '192.168.1.209';
$dbname = 'callbackreminder';
$username = 'root';
$password = 'Pakistan92';

try {
    // Set PHP timezone to Asia/Karachi
    date_default_timezone_set('Asia/Karachi');
    
    // Create database connection
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Set MySQL session timezone to UTC (for TIMESTAMP columns)
    $pdo->exec("SET time_zone = '+00:00'");
    
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('No data received');
    }
    
    // Validate required fields
    if (empty($input['id']) || empty($input['status'])) {
        throw new Exception('ID and status are required');
    }
    
    // Get current status before updating
    $currentStatusSql = "SELECT current_status FROM door_to_door WHERE id = :id";
    $currentStatusStmt = $pdo->prepare($currentStatusSql);
    $currentStatusStmt->bindParam(':id', $input['id']);
    $currentStatusStmt->execute();
    $currentStatus = $currentStatusStmt->fetchColumn();
    
    // Update the status in door_to_door table
    $sql = "UPDATE door_to_door SET current_status = :status WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':status', $input['status']);
    $stmt->bindParam(':id', $input['id']);
    $stmt->execute();

    $rowsUpdated = $stmt->rowCount();
    $statusChanged = $currentStatus !== $input['status'];

    if ($rowsUpdated > 0 || !$statusChanged) {
        // Record status change in history
        if ($statusChanged) {
            // Get current Karachi time and convert to UTC for TIMESTAMP column
            // MySQL TIMESTAMP columns store in UTC and convert based on session timezone
            $nowKarachi = new DateTime('now', new DateTimeZone('Asia/Karachi'));
            $nowKarachi->setTimezone(new DateTimeZone('UTC'));
            $changedAtUTC = $nowKarachi->format('Y-m-d H:i:s');
            
            // Insert with explicit UTC timestamp (MySQL TIMESTAMP will convert correctly)
            $historySql = "INSERT INTO dds_status_history (dds_id, old_status, new_status, changed_by, change_reason, changed_at) 
                           VALUES (:dds_id, :old_status, :new_status, :changed_by, :change_reason, :changed_at)";
            $historyStmt = $pdo->prepare($historySql);
            
            // Assign values to variables to avoid bindParam issues
            $ddsId = $input['id'];
            $oldStatus = $currentStatus;
            $newStatus = $input['status'];
            $changedBy = $input['changedBy'] ?? 'System';
            $changeReason = $input['changeReason'] ?? 'Status updated';
            
            $historyStmt->bindParam(':dds_id', $ddsId);
            $historyStmt->bindParam(':old_status', $oldStatus);
            $historyStmt->bindParam(':new_status', $newStatus);
            $historyStmt->bindParam(':changed_by', $changedBy);
            $historyStmt->bindParam(':change_reason', $changeReason);
            $historyStmt->bindParam(':changed_at', $changedAtUTC);
            $historyStmt->execute();
        }

        $message = $statusChanged
            ? 'Status updated successfully'
            : 'Status already set to the requested value';

        echo json_encode([
            'success' => true,
            'message' => $message,
            'oldStatus' => $currentStatus,
            'newStatus' => $input['status']
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'No records updated. Record may not exist.'
        ]);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?> 

