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

// Get user_no from URL parameter
$user_no = isset($_GET['user_no']) ? $_GET['user_no'] : null;

if (!$user_no) {
    echo json_encode(['error' => 'User number not provided']);
    exit;
}

try {
    // Connect to SQL Server using pdo_sqlsrv (already enabled in XAMPP)
    $conn = new PDO("sqlsrv:Server=192.168.1.6,1433;Database=Rizwan;TrustServerCertificate=yes", "Rizwan", "cs786");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Query to get the agent's full name
    $sql = "SELECT FullName FROM [Rizwan].[dbo].[vwUsers] WHERE code = :user_no";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':user_no', $user_no, PDO::PARAM_INT);
    $stmt->execute();
    
    if ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
        echo json_encode(['fullName' => $row->FullName]);
    } else {
        echo json_encode(['error' => 'Agent not found']);
    }

} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?> 
