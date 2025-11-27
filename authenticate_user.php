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
    // Get username and password from request
    $username = $_POST['username'] ?? $_GET['username'] ?? '';
    $password = $_POST['password'] ?? $_GET['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        echo json_encode([
            'status' => 'error',
            'error' => 'Username and password are required'
        ]);
        exit;
    }

    // Check for department logins first (dds-access, orders-access tables)
    // These are checked against database access tables with username and password
    $normalizedUsername = strtolower(trim($username));
    $department = '';
    
    // Connect to MySQL to check department access
    $mysqlHost = '192.168.1.209';
    $mysqlDb = 'callback2';
    $mysqlUser = 'root';
    $mysqlPass = 'Pakistan92';
    
    $mysqlConn = new PDO("mysql:host=$mysqlHost;dbname=$mysqlDb;charset=utf8mb4", $mysqlUser, $mysqlPass);
    $mysqlConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check DDS access first
    $ddsSql = "SELECT id, username, password, full_name FROM dds_access WHERE username = :username AND is_active = 1";
    $ddsStmt = $mysqlConn->prepare($ddsSql);
    $ddsStmt->bindParam(':username', $normalizedUsername);
    $ddsStmt->execute();
    $ddsRow = $ddsStmt->fetch(PDO::FETCH_OBJ);
    
    if ($ddsRow && $ddsRow->password === $password) {
        // DDS login successful
        echo json_encode([
            'status' => 'success',
            'code' => $normalizedUsername,
            'fullName' => $ddsRow->full_name ? $ddsRow->full_name : 'Door-to-Door Agent',
            'loginName' => $normalizedUsername,
            'hasDDSAccess' => true,
            'hasOrdersAccess' => false,
            'isSpecialLogin' => true
        ]);
        exit;
    }
    
    // Check Orders access
    $ordersSql = "SELECT id, username, password, full_name FROM orders_access WHERE username = :username AND is_active = 1";
    $ordersStmt = $mysqlConn->prepare($ordersSql);
    $ordersStmt->bindParam(':username', $normalizedUsername);
    $ordersStmt->execute();
    $ordersRow = $ordersStmt->fetch(PDO::FETCH_OBJ);
    
    if ($ordersRow && $ordersRow->password === $password) {
        // Orders login successful
        echo json_encode([
            'status' => 'success',
            'code' => $normalizedUsername,
            'fullName' => $ordersRow->full_name ? $ordersRow->full_name : 'Order Management Agent',
            'loginName' => $normalizedUsername,
            'hasDDSAccess' => false,
            'hasOrdersAccess' => true,
            'isSpecialLogin' => true
        ]);
        exit;
    }

    // Connect to SQL Server using pdo_sqlsrv
    $conn = new PDO("sqlsrv:Server=192.168.1.6,1433;Database=Rizwan;TrustServerCertificate=yes", "Rizwan", "cs786");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Query to authenticate user using LoginName and LoginPassword
    $sql = "SELECT code, FullName, IntallicomUsers, LoginName, LoginPassword 
            FROM [Rizwan].[dbo].[vwUsers] 
            WHERE LoginName = :username AND LoginPassword = :password";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':username', $username);
    $stmt->bindParam(':password', $password);
    $stmt->execute();
    
    $row = $stmt->fetch(PDO::FETCH_OBJ);
    
    if ($row) {
        // User authenticated successfully
        // Check department access from MySQL database
        $mysqlHost = '192.168.1.209';
        $mysqlDb = 'callback2';
        $mysqlUser = 'root';
        $mysqlPass = 'Pakistan92';
        
        $mysqlConn = new PDO("mysql:host=$mysqlHost;dbname=$mysqlDb;charset=utf8mb4", $mysqlUser, $mysqlPass);
        $mysqlConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Check DDS access - username is manually entered in database, check both code and LoginName
        // Team Lead can add user by either code or LoginName in the database
        $ddsSql = "SELECT id FROM dds_access WHERE username = :username AND is_active = 1";
        
        // Try with code (as string)
        $userCodeStr = (string)$row->code;
        $ddsStmt = $mysqlConn->prepare($ddsSql);
        $ddsStmt->bindParam(':username', $userCodeStr);
        $ddsStmt->execute();
        $hasDDSAccess = $ddsStmt->fetch(PDO::FETCH_OBJ) !== false;
        
        // If not found, try with LoginName (Team Lead might have added by LoginName)
        if (!$hasDDSAccess && !empty($row->LoginName)) {
            $ddsStmt2 = $mysqlConn->prepare($ddsSql);
            $ddsStmt2->bindParam(':username', $row->LoginName);
            $ddsStmt2->execute();
            $hasDDSAccess = $ddsStmt2->fetch(PDO::FETCH_OBJ) !== false;
        }
        
        // Check Orders access - username is manually entered in database, check both code and LoginName
        $ordersSql = "SELECT id FROM orders_access WHERE username = :username AND is_active = 1";
        
        // Try with code (as string)
        $ordersStmt = $mysqlConn->prepare($ordersSql);
        $ordersStmt->bindParam(':username', $userCodeStr);
        $ordersStmt->execute();
        $hasOrdersAccess = $ordersStmt->fetch(PDO::FETCH_OBJ) !== false;
        
        // If not found, try with LoginName (Team Lead might have added by LoginName)
        if (!$hasOrdersAccess && !empty($row->LoginName)) {
            $ordersStmt2 = $mysqlConn->prepare($ordersSql);
            $ordersStmt2->bindParam(':username', $row->LoginName);
            $ordersStmt2->execute();
            $hasOrdersAccess = $ordersStmt2->fetch(PDO::FETCH_OBJ) !== false;
        }
        
        echo json_encode([
            'status' => 'success',
            'code' => $row->code,
            'fullName' => $row->FullName,
            'loginName' => $row->LoginName,
            'hasDDSAccess' => $hasDDSAccess,
            'hasOrdersAccess' => $hasOrdersAccess
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'error' => 'Invalid username or password'
        ]);
    }

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

