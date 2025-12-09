<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
date_default_timezone_set('Asia/Karachi');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$servername = "192.168.1.209";
$username = "root";
$password = "Pakistan92";
$dbname = "callback2";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit();
}

// Set autocommit to false for transaction to prevent race conditions
$conn->autocommit(false);

// Get data from POST request
$complaintId = $_POST['complaint_id'] ?? null;
$phoneNumber = $_POST['phone_number'] ?? null;
$eventType = $_POST['event_type'] ?? 'ring';
$agentName = !empty($_POST['agent_name']) ? trim($_POST['agent_name']) : null;
$popupType = $_POST['popup_type'] ?? 'call'; // call, customer, dds, order, new_customer

// Log for debugging (remove in production if needed)
error_log("save_call_received.php - agent_name received: " . ($agentName ?? 'NULL') . " | phone_number: " . ($phoneNumber ?? 'NULL'));

// Validate required fields - phone_number is always required, complaint_id is optional
if (!$phoneNumber) {
    echo json_encode(['status' => 'error', 'message' => 'Missing required parameter: phone_number is required']);
    exit();
}

// Get current datetime in Asia/Karachi timezone
$callReceivedTime = date('Y-m-d H:i:s');

// Check if an entry exists for the same phone number within the last 30 seconds (same call)
// Use a wider window to catch all related events (ring, answer, hangup, etc.)
$checkSql = "SELECT id, complaint_id, call_received_time, popup_type, agent_name
             FROM call_received_logs 
             WHERE phone_number = ? 
             AND call_received_time >= DATE_SUB(?, INTERVAL 30 SECOND)
             ORDER BY id DESC 
             LIMIT 1";

$checkStmt = $conn->prepare($checkSql);
if (!$checkStmt) {
    $conn->rollback();
    $conn->autocommit(true);
    echo json_encode(['status' => 'error', 'message' => 'Error preparing check statement: ' . $conn->error]);
    $conn->close();
    exit();
}

$checkStmt->bind_param("ss", $phoneNumber, $callReceivedTime);
$checkStmt->execute();
$result = $checkStmt->get_result();
$existingEntry = $result->fetch_assoc();
$checkStmt->close();

if ($existingEntry) {
    // Entry exists - merge complaint_id and popup_type
    $existingComplaintIds = $existingEntry['complaint_id'];
    $existingPopupTypes = $existingEntry['popup_type'] ?? '';
    $newComplaintId = (!empty($complaintId)) ? $complaintId : null;
    
    // Merge complaint IDs
    $mergedIds = [];
    if (!empty($existingComplaintIds)) {
        // Split existing IDs (comma-separated)
        $existingIds = array_map('trim', explode(',', $existingComplaintIds));
        $mergedIds = array_unique(array_filter($existingIds)); // Remove empty values
    }
    
    // Add new IDs if provided (can be comma-separated)
    if (!empty($newComplaintId)) {
        $newIds = array_map('trim', explode(',', $newComplaintId));
        foreach ($newIds as $id) {
            if (!empty($id)) {
                $mergedIds[] = $id;
            }
        }
        $mergedIds = array_unique($mergedIds);
    }
    
    // Join back with comma
    $finalComplaintId = !empty($mergedIds) ? implode(',', $mergedIds) : null;
    
    // Merge popup types
    $mergedPopupTypes = [];
    if (!empty($existingPopupTypes)) {
        $existingTypes = array_map('trim', explode(',', $existingPopupTypes));
        $mergedPopupTypes = array_unique(array_filter($existingTypes));
    }
    
    // Add new popup types (can be comma-separated)
    if (!empty($popupType)) {
        $newTypes = array_map('trim', explode(',', $popupType));
        foreach ($newTypes as $type) {
            if (!empty($type)) {
                $mergedPopupTypes[] = $type;
            }
        }
        $mergedPopupTypes = array_unique($mergedPopupTypes);
    }
    
    $finalPopupType = !empty($mergedPopupTypes) ? implode(',', $mergedPopupTypes) : $popupType;
    
    // Update agent_name if it's empty in existing entry or if new agent_name is provided
    $existingAgentName = $existingEntry['agent_name'] ?? null;
    $finalAgentName = $existingAgentName;
    
    // If existing agent_name is empty/null and new agent_name is provided, use new one
    if ((empty($existingAgentName) || $existingAgentName === null) && !empty($agentName)) {
        $finalAgentName = $agentName;
    }
    // If both exist, prefer the new one (in case agent changed)
    elseif (!empty($agentName)) {
        $finalAgentName = $agentName;
    }
    
    // Update existing entry - merge complaint_id, popup_type, and update agent_name
    $updateSql = "UPDATE call_received_logs 
                   SET complaint_id = ?, 
                       popup_type = ?,
                       agent_name = ?
                   WHERE id = ?";
    
    $updateStmt = $conn->prepare($updateSql);
    if (!$updateStmt) {
        $conn->rollback();
        $conn->autocommit(true);
        echo json_encode(['status' => 'error', 'message' => 'Error preparing update statement: ' . $conn->error]);
        $conn->close();
        exit();
    }
    
    $updateStmt->bind_param("sssi", $finalComplaintId, $finalPopupType, $finalAgentName, $existingEntry['id']);
    
    if ($updateStmt->execute()) {
        $conn->commit();
        $updateStmt->close();
        $conn->close();
        echo json_encode([
            'status' => 'success', 
            'message' => 'Call received time updated (merged) successfully',
            'data' => [
                'id' => $existingEntry['id'],
                'complaint_id' => $finalComplaintId,
                'phone_number' => $phoneNumber,
                'call_received_time' => $existingEntry['call_received_time'],
                'agent_name' => $finalAgentName,
                'merged' => true
            ]
        ]);
        exit();
    } else {
        $conn->rollback();
        $conn->autocommit(true);
        $updateStmt->close();
        $conn->close();
        echo json_encode(['status' => 'error', 'message' => 'Error updating call received time: ' . $updateStmt->error]);
        exit();
    }
} else {
    // No existing entry - insert new
    // Set created_at explicitly with proper timezone
    $sql = "INSERT INTO call_received_logs (complaint_id, phone_number, call_received_time, event_type, agent_name, popup_type, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        $conn->rollback();
        $conn->autocommit(true);
        echo json_encode(['status' => 'error', 'message' => 'Error preparing statement: ' . $conn->error]);
        $conn->close();
        exit();
    }

    // Use NULL if complaint_id is empty
    $complaintIdValue = (!empty($complaintId)) ? $complaintId : null;
    // Use NULL if agent_name is empty (to ensure proper database handling)
    $agentNameValue = (!empty($agentName)) ? $agentName : null;
    // Use call_received_time for created_at to ensure consistency
    $createdAt = $callReceivedTime;
    $stmt->bind_param("sssssss", $complaintIdValue, $phoneNumber, $callReceivedTime, $eventType, $agentNameValue, $popupType, $createdAt);

    if ($stmt->execute()) {
        $conn->commit();
        $stmt->close();
        $conn->close();
        echo json_encode([
            'status' => 'success', 
            'message' => 'Call received time saved successfully',
            'data' => [
                'id' => $stmt->insert_id,
                'complaint_id' => $complaintId,
                'phone_number' => $phoneNumber,
                'call_received_time' => $callReceivedTime,
                'agent_name' => $agentNameValue,
                'merged' => false
            ]
        ]);
        exit();
    } else {
        $conn->rollback();
        $conn->autocommit(true);
        $stmt->close();
        $conn->close();
        echo json_encode(['status' => 'error', 'message' => 'Error saving call received time: ' . $stmt->error]);
        exit();
    }
}
?>

