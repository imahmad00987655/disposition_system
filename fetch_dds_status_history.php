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
    // Create database connection
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Set MySQL session timezone to UTC to get raw timestamps
    $pdo->exec("SET time_zone = '+00:00'");
    
    // Set PHP timezone to Asia/Karachi for conversions
    date_default_timezone_set('Asia/Karachi');
    
    // Get DDS ID from query parameter
    $ddsId = $_GET['dds_id'] ?? null;
    
    if (!$ddsId) {
        throw new Exception('DDS ID is required');
    }
    
    // Fetch status history for the DDS appointment
    $sql = "SELECT old_status, new_status, changed_by, change_reason, changed_at 
            FROM dds_status_history 
            WHERE dds_id = :dds_id 
            ORDER BY changed_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':dds_id', $ddsId);
    $stmt->execute();
    
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert timestamps from UTC to Karachi timezone
    foreach ($history as &$entry) {
        if (!empty($entry['changed_at'])) {
            try {
                // Parse as UTC (since we set MySQL session to UTC)
                $timestamp = new DateTime($entry['changed_at'], new DateTimeZone('UTC'));
                // Convert to Karachi timezone
                $timestamp->setTimezone(new DateTimeZone('Asia/Karachi'));
                // Format as ISO datetime string
                $entry['changed_at'] = $timestamp->format('Y-m-d H:i:s');
            } catch (Exception $e) {
                // Keep original if parsing fails
                error_log("Failed to convert timestamp: " . $e->getMessage());
            }
        }
    }
    unset($entry);
    
    echo json_encode([
        'success' => true,
        'data' => $history,
        'count' => count($history)
    ]);
    
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
