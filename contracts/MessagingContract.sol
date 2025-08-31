// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DecentralizedMessaging {
    struct Message {
        address sender;
        string encryptedContent;
        uint256 timestamp;
        bool isRead;
    }
    
    // Mapping von Benutzer-Adressen zu ihren Nachrichten
    mapping(address => mapping(address => Message[])) private messages;
    
    // Mapping für Benutzerprofile
    mapping(address => string) public userProfiles;
    
    event MessageSent(
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    
    function sendMessage(address _to, string memory _encryptedContent) public {
        Message memory newMessage = Message({
            sender: msg.sender,
            encryptedContent: _encryptedContent,
            timestamp: block.timestamp,
            isRead: false
        });
        
        messages[msg.sender][_to].push(newMessage);
        messages[_to][msg.sender].push(newMessage);
        
        emit MessageSent(msg.sender, _to, block.timestamp);
    }
    
    function getMessages(address _with) public view returns (Message[] memory) {
        return messages[msg.sender][_with];
    }
    
    function updateProfile(string memory _profileData) public {
        userProfiles[msg.sender] = _profileData;
    }
}