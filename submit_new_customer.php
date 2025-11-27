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
    
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Log received data for debugging
    error_log('Received customer data: ' . print_r($input, true));
    
    if (!$input) {
        throw new Exception('No data received');
    }
    
    // Validate required fields
    $required_fields = ['gender', 'customerName', 'city', 'contact', 'brandType', 'reasonOfCall'];
    $missing_fields = [];
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            $missing_fields[] = $field;
        }
    }
    
    if (!empty($missing_fields)) {
        throw new Exception("Missing required fields: " . implode(', ', $missing_fields));
    }
    
    // Set defaults for optional fields
    $address = isset($input['address']) ? $input['address'] : '';
    $comments = isset($input['comments']) ? $input['comments'] : '';
    $agentName = isset($input['agentName']) ? $input['agentName'] : 'Unknown';
    $dateAdded = isset($input['dateAdded']) ? $input['dateAdded'] : date('Y-m-d H:i:s');
    
    // Prepare SQL statement (removed current_status column as it doesn't exist)
    $sql = "INSERT INTO new_customers (gender, customer_name, city, contact, brand_type, reason_of_call, address, comments, agent_name, date_added) 
            VALUES (:gender, :customerName, :city, :contact, :brandType, :reasonOfCall, :address, :comments, :agentName, :dateAdded)";
    
    $stmt = $pdo->prepare($sql);
    
    // Bind parameters
    $stmt->bindParam(':gender', $input['gender']);
    $stmt->bindParam(':customerName', $input['customerName']);
    $stmt->bindParam(':city', $input['city']);
    $stmt->bindParam(':contact', $input['contact']);
    $stmt->bindParam(':brandType', $input['brandType']);
    $stmt->bindParam(':reasonOfCall', $input['reasonOfCall']);
    $stmt->bindParam(':address', $address);
    $stmt->bindParam(':comments', $comments);
    $stmt->bindParam(':agentName', $agentName);
    $stmt->bindParam(':dateAdded', $dateAdded);
    
    // Execute the statement
    error_log('Executing SQL insert for new customer');
    $stmt->execute();
    error_log('Customer inserted successfully with ID: ' . $pdo->lastInsertId());
    
    // If it's a DDS appointment, also save to DDS table
    if ($input['reasonOfCall'] === 'New DDS Appointment' && !empty($address)) {
        error_log('Also inserting into DDS table');
        
        $currentStatus = isset($input['currentStatus']) ? $input['currentStatus'] : 'Customer is in contact with DDS';
        
        $ddsSql = "INSERT INTO door_to_door (gender, customer_name, city, contact, brand_type, address, comments, current_status, agent_name, date_added) 
                   VALUES (:gender, :customerName, :city, :contact, :brandType, :address, :comments, :currentStatus, :agentName, :dateAdded)";
        
        $ddsStmt = $pdo->prepare($ddsSql);
        $ddsStmt->bindParam(':gender', $input['gender']);
        $ddsStmt->bindParam(':customerName', $input['customerName']);
        $ddsStmt->bindParam(':city', $input['city']);
        $ddsStmt->bindParam(':contact', $input['contact']);
        $ddsStmt->bindParam(':brandType', $input['brandType']);
        $ddsStmt->bindParam(':address', $address);
        $ddsStmt->bindParam(':comments', $comments);
        $ddsStmt->bindParam(':currentStatus', $currentStatus);
        $ddsStmt->bindParam(':agentName', $agentName);
        $ddsStmt->bindParam(':dateAdded', $dateAdded);
        $ddsStmt->execute();
        
        error_log('DDS record inserted successfully with ID: ' . $pdo->lastInsertId());
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Customer registered successfully',
        'customerId' => $pdo->lastInsertId()
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