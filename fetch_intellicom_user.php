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
    // Get the full name from the request
    $fullName = $_GET['full_name'] ?? '';
    
    if (empty($fullName)) {
        echo json_encode(['error' => 'Full name is required']);
        exit;
    }

    // Connect to SQL Server using pdo_sqlsrv (already enabled in XAMPP)
    $conn = new PDO("sqlsrv:Server=192.168.1.6,1433;Database=Rizwan;TrustServerCertificate=yes", "Rizwan", "cs786");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Query to get the Intellicom username
    $sql = "SELECT IntallicomUsers FROM [Rizwan].[dbo].[vwUsers] WHERE FullName = :fullName";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':fullName', $fullName);
    $stmt->execute();
    
    if ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
        if ($row->IntallicomUsers) {
            echo json_encode(['intellicomUserName' => $row->IntallicomUsers]);
        } else {
            echo json_encode(['error' => 'No Intellicom username found for: ' . $fullName]);
        }
    } else {
        echo json_encode(['error' => 'No Intellicom username found for: ' . $fullName]);
    }

} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?> 
