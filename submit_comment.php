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

$complaintId = $_POST['complaint_id'] ?? null;
$comment = $_POST['comment'] ?? null;
$commentType = $_POST['commentType'] ?? null;
$agentName = $_POST['agentName'] ?? null;
$taggedTo = $_POST['taggedTo'] ?? '';
$timelineDate = $_POST['timelineDate'] ?? null;
$timelineTime = $_POST['timelineTime'] ?? null;

if (!$complaintId || !$comment || !$commentType || !$agentName) {
    echo json_encode(['status' => 'error', 'message' => 'Missing required parameters']);
    exit();
}

$currentDate = date("Y-m-d");
$currentTime = date("h:i:s A"); 

$countSql = "SELECT COUNT(*) as count FROM comments WHERE complaint_id = ? AND comment_type != 'Auto'";
$countStmt = $conn->prepare($countSql);

if (!$countStmt) {
    echo json_encode(['status' => 'error', 'message' => 'Error preparing count statement: ' . $conn->error]);
    exit();
}
$countStmt->bind_param("s", $complaintId);
$countStmt->execute();
$countResult = $countStmt->get_result();

if ($countResult) {
    $row = $countResult->fetch_assoc();
    $count = $row['count'];

    if ($count == 2) { 
        $taggedTo = !empty($taggedTo) ? "$taggedTo, Rizwan (Manager)" : "Rizwan (Manager)";
    }
     
} else {
    echo json_encode(['status' => 'error', 'message' => 'Error fetching count: ' . $countStmt->error]);
    $countStmt->close();
    $conn->close();
    exit();
}

$countStmt->close();

// Ensure timeline_date and timeline_time are NULL for the special comment
if ($comment === "Customer is guided to wait as per already added timelines") {
    $timelineDate = null;
    $timelineTime = null;
} else {
    // Apply auto-logic for other cases if timeline is not provided
    if (!$timelineDate || !$timelineTime) {
        $currentDateTime = new DateTime();
        $startOfDay = new DateTime($currentDateTime->format('Y-m-d') . ' 09:15:00');
        $endOfDay = new DateTime($currentDateTime->format('Y-m-d') . ' 17:30:00');

        $remainingHoursToday = max(($endOfDay->getTimestamp() - $currentDateTime->getTimestamp()) / 3600, 0);

        if ($remainingHoursToday >= 8) {
            $timelineDate = $currentDateTime->format('Y-m-d');
            $timelineTime = $currentDateTime->modify('+8 hours')->format('H:i:s');
        } else {
            $extraHours = 8 - $remainingHoursToday;
            $nextWorkingDay = new DateTime($currentDateTime->modify('+1 day')->format('Y-m-d') . ' 09:15:00');
            while ($nextWorkingDay->format('N') >= 6) { // Adjust for weekends
                $nextWorkingDay->modify('+1 day');
            }
            $timelineDate = $nextWorkingDay->format('Y-m-d');
            $timelineTime = $nextWorkingDay->modify("+$extraHours hours")->format('H:i:s');
        }
    }
}

// Set timeline to NULL if commentType is 'done'
if ($commentType === 'done') {
    $timelineDate = null;
    $timelineTime = null;
}

$sql = "INSERT INTO comments (complaint_id, comment, comment_type, comment_date, comment_time, agent_name, tagged_to, timeline_date, timeline_time) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['status' => 'error', 'message' => 'Error preparing insert statement: ' . $conn->error]);
    exit();
}

$stmt->bind_param("sssssssss", $complaintId, $comment, $commentType, $currentDate, $currentTime, $agentName, $taggedTo, $timelineDate, $timelineTime);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Comment added successfully']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Error adding comment: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
