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
    // Get username from request (changed from user_code to username)
    $username = $_GET['username'] ?? $_POST['username'] ?? $_GET['user_code'] ?? $_POST['user_code'] ?? '';
    $department = $_GET['department'] ?? $_POST['department'] ?? '';
    
    if (empty($username) || empty($department)) {
        echo json_encode([
            'status' => 'error',
            'error' => 'Username and department are required',
            'hasAccess' => false
        ]);
        exit;
    }

    // Validate department
    if (!in_array($department, ['dds', 'orders'])) {
        echo json_encode([
            'status' => 'error',
            'error' => 'Invalid department. Must be "dds" or "orders"',
            'hasAccess' => false
        ]);
        exit;
    }

    // Connect to MySQL database
    $mysqlHost = '192.168.1.209';
    $mysqlDb = 'callback2';
    $mysqlUser = 'root';
    $mysqlPass = 'Pakistan92';
    
    $mysqlConn = new PDO("mysql:host=$mysqlHost;dbname=$mysqlDb;charset=utf8mb4", $mysqlUser, $mysqlPass);
    $mysqlConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Determine which table to check
    $tableName = $department === 'dds' ? 'dds_access' : 'orders_access';
    
    // Check if user has access (using username instead of user_code)
    $sql = "SELECT id, username, full_name, is_active 
            FROM $tableName 
            WHERE username = :username AND is_active = 1";
    $stmt = $mysqlConn->prepare($sql);
    $stmt->bindParam(':username', $username);
    $stmt->execute();
    
    $row = $stmt->fetch(PDO::FETCH_OBJ);
    
    if ($row) {
        echo json_encode([
            'status' => 'success',
            'hasAccess' => true,
            'username' => $row->username,
            'full_name' => $row->full_name
        ]);
    } else {
        echo json_encode([
            'status' => 'success',
            'hasAccess' => false,
            'message' => 'User does not have access to ' . strtoupper($department) . ' module'
        ]);
    }

} catch (PDOException $e) {
    echo json_encode([
        'status' => 'error',
        'error' => 'Database error: ' . $e->getMessage(),
        'hasAccess' => false
    ]);
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage(),
        'hasAccess' => false
    ]);
}
?>

