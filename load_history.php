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

// Set PHP timezone to Asia/Karachi
date_default_timezone_set('Asia/Karachi');

$complaintId = $_GET['complaint_id'] ?? null;

if (!$complaintId) {
    echo json_encode(['status' => 'error', 'message' => 'Missing complaint_id']);
    exit();
}

// Get comment_date and comment_time separately and format properly
$sql = "SELECT comment, 
        comment_date, 
        comment_time,
        agent_name, tagged_to, timeline_date, timeline_time 
        FROM comments WHERE complaint_id = ? ORDER BY id DESC";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['status' => 'error', 'message' => 'Error preparing statement: ' . $conn->error]);
    exit();
}

$stmt->bind_param("s", $complaintId);
$stmt->execute();
$result = $stmt->get_result();

$comments = [];
while ($row = $result->fetch_assoc()) {
    // Combine date and time, then ensure it's in Karachi timezone
    if (!empty($row['comment_date']) && !empty($row['comment_time'])) {
        try {
            // Combine date and time
            $dateTimeString = trim($row['comment_date']) . ' ' . trim($row['comment_time']);
            
            // Parse the datetime - explicitly set timezone to Karachi since that's where the data is stored
            $dt = new DateTime($dateTimeString, new DateTimeZone('Asia/Karachi'));
            
            // Format as ISO datetime string (already in Karachi timezone)
            $row['timestamp'] = $dt->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            // Fallback: try parsing without timezone first, then set to Karachi
            try {
                $dt = new DateTime($dateTimeString);
                $dt->setTimezone(new DateTimeZone('Asia/Karachi'));
                $row['timestamp'] = $dt->format('Y-m-d H:i:s');
            } catch (Exception $e2) {
                // Final fallback: just concatenate date and time
                error_log("Failed to parse timestamp: " . $e2->getMessage() . " | Date: " . ($row['comment_date'] ?? '') . " | Time: " . ($row['comment_time'] ?? ''));
                $row['timestamp'] = ($row['comment_date'] ?? '') . ' ' . ($row['comment_time'] ?? '');
            }
        }
    } else {
        $row['timestamp'] = '';
    }
    
    // Format timeline_date & timeline_time - ensure normalized and in Karachi time
    if (!empty($row['timeline_date']) && !empty($row['timeline_time'])) {
        try {
            $timelineDateRaw = trim($row['timeline_date']);
            $timelineTimeRaw = trim($row['timeline_time']);

            // Normalize timeline time to HH:MM:SS (24-hour)
            $timelineTimeNormalized = $timelineTimeRaw;

            if (preg_match('/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i', $timelineTimeRaw, $matches)) {
                $hours = (int)$matches[1];
                $minutes = $matches[2];
                $period = strtoupper($matches[4]);

                if ($period === 'PM' && $hours != 12) {
                    $hours += 12;
                } elseif ($period === 'AM' && $hours == 12) {
                    $hours = 0;
                }
                $timelineTimeNormalized = sprintf('%02d:%s:%s', $hours, $minutes, $matches[3] ?? '00');
            } elseif (preg_match('/^(\d{1,2}):(\d{2})$/', $timelineTimeRaw)) {
                $timelineTimeNormalized = $timelineTimeRaw . ':00';
            }

            // Combine date & time assuming stored in Asia/Karachi
            $timelineDateTime = new DateTime(
                $timelineDateRaw . ' ' . $timelineTimeNormalized,
                new DateTimeZone('Asia/Karachi')
            );

            $row['timeline_date'] = $timelineDateTime->format('Y-m-d');
            $row['timeline_time'] = $timelineDateTime->format('H:i:s');
        } catch (Exception $e) {
            error_log(
                "Failed to normalize timeline date/time: " . $e->getMessage() .
                " | Date: " . ($row['timeline_date'] ?? '') .
                " | Time: " . ($row['timeline_time'] ?? '')
            );
        }
    }
    
    // Remove the separate date/time fields
    unset($row['comment_date']);
    unset($row['comment_time']);
    
    $comments[] = $row;
}

echo json_encode($comments);

$stmt->close();
$conn->close();

?>
