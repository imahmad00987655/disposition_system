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

$servername = "192.168.1.209";
$username = "root";
$password = "Pakistan92";
$dbname = "callback2";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit();
}

$commentTypeId = $_GET['comment_type_id'] ?? null;
$commentText = $_GET['comment_text'] ?? null;
$module = $_GET['module'] ?? null;

// Either comment_type_id or (comment_text + module) must be provided
if (!$commentTypeId && (!$commentText || !$module)) {
    echo json_encode(['status' => 'error', 'message' => 'Missing parameters. Provide either comment_type_id or (comment_text + module)']);
    exit();
}

if (!$commentTypeId && $commentText && $module) {
    // Look up comment type ID by text and module
    $lookupSql = "SELECT id FROM comment_types WHERE module = ? AND comment_text = ? AND is_active = 1 LIMIT 1";
    $lookupStmt = $conn->prepare($lookupSql);
    
    if (!$lookupStmt) {
        echo json_encode(['status' => 'error', 'message' => 'Error preparing lookup statement: ' . $conn->error]);
        exit();
    }
    
    $lookupStmt->bind_param("ss", $module, $commentText);
    $lookupStmt->execute();
    $lookupResult = $lookupStmt->get_result();
    
    if ($lookupRow = $lookupResult->fetch_assoc()) {
        $commentTypeId = $lookupRow['id'];
    } else {
        echo json_encode(['status' => 'success', 'data' => []]);
        $lookupStmt->close();
        $conn->close();
        exit();
    }
    
    $lookupStmt->close();
}

$sql = "SELECT 
    id,
    option_text,
    display_order
FROM additional_options 
WHERE comment_type_id = ? AND is_active = 1 
ORDER BY display_order ASC, option_text ASC";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['status' => 'error', 'message' => 'Error preparing statement: ' . $conn->error]);
    exit();
}

$stmt->bind_param("i", $commentTypeId);
$stmt->execute();
$result = $stmt->get_result();

$options = [];
while ($row = $result->fetch_assoc()) {
    $options[] = [
        'id' => (int)$row['id'],
        'option_text' => $row['option_text'],
        'display_order' => (int)$row['display_order'],
    ];
}

echo json_encode([
    'status' => 'success',
    'data' => $options
]);

$stmt->close();
$conn->close();
?>

