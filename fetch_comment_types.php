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

$module = $_GET['module'] ?? null;

if (!$module) {
    echo json_encode(['status' => 'error', 'message' => 'Missing module parameter']);
    exit();
}

// Validate module
$validModules = ['complaint', 'order', 'dds'];
if (!in_array($module, $validModules)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid module. Must be: complaint, order, or dds']);
    exit();
}

$sql = "SELECT 
    id,
    comment_text,
    requires_tagged_user,
    requires_timeline,
    auto_timeline,
    clear_timeline,
    display_order
FROM comment_types 
WHERE module = ? AND is_active = 1 
ORDER BY display_order ASC, comment_text ASC";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['status' => 'error', 'message' => 'Error preparing statement: ' . $conn->error]);
    exit();
}

$stmt->bind_param("s", $module);
$stmt->execute();
$result = $stmt->get_result();

$commentTypes = [];
while ($row = $result->fetch_assoc()) {
    $commentTypes[] = [
        'id' => (int)$row['id'],
        'comment_text' => $row['comment_text'],
        'requires_tagged_user' => (int)$row['requires_tagged_user'],
        'requires_timeline' => (int)$row['requires_timeline'],
        'auto_timeline' => (bool)$row['auto_timeline'],
        'clear_timeline' => (bool)$row['clear_timeline'],
        'display_order' => (int)$row['display_order'],
    ];
}

echo json_encode([
    'status' => 'success',
    'data' => $commentTypes
]);

$stmt->close();
$conn->close();
?>

