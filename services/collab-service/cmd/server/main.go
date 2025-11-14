package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// Client represents a connected user
type Client struct {
	ID        string
	Conn      *websocket.Conn
	SessionID string
	Username  string
	Send      chan []byte
}

// Session represents a collaboration session with multiple clients
type Session struct {
	ID      string
	Clients map[string]*Client
	mu      sync.RWMutex
}

// Hub manages all sessions and clients
type Hub struct {
	sessions   map[string]*Session
	register   chan *Client
	unregister chan *Client
	broadcast  chan *BroadcastMessage
	mu         sync.RWMutex
}

// BroadcastMessage contains message and target session
type BroadcastMessage struct {
	SessionID string
	Message   []byte
	Sender    *Client
}

// Message types
type IncomingMessage struct {
	Type      string                 `json:"type"`
	SessionID string                 `json:"sessionId"`
	Token     string                 `json:"token,omitempty"`
	Username  string                 `json:"username,omitempty"`
	Code      string                 `json:"code,omitempty"`
	Cursor    map[string]interface{} `json:"cursor,omitempty"`
}

type OutgoingMessage struct {
	Type         string                 `json:"type"`
	UserID       string                 `json:"userId,omitempty"`
	Username     string                 `json:"username,omitempty"`
	Code         string                 `json:"code,omitempty"`
	Cursor       map[string]interface{} `json:"cursor,omitempty"`
	Participants []Participant          `json:"participants,omitempty"`
}

type Participant struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Color    string `json:"color"`
}

var userColors = []string{
	"#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
	"#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2",
}

func newHub() *Hub {
	return &Hub{
		sessions:   make(map[string]*Session),
		broadcast:  make(chan *BroadcastMessage, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) getOrCreateSession(sessionID string) *Session {
	h.mu.Lock()
	defer h.mu.Unlock()

	session, exists := h.sessions[sessionID]
	if !exists {
		session = &Session{
			ID:      sessionID,
			Clients: make(map[string]*Client),
		}
		h.sessions[sessionID] = session
		log.Printf("Created new session: %s", sessionID)
	}
	return session
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			session := h.getOrCreateSession(client.SessionID)
			session.mu.Lock()
			session.Clients[client.ID] = client
			session.mu.Unlock()

			log.Printf("Client %s connected to session %s. Total in session: %d",
				client.ID, client.SessionID, len(session.Clients))

			// Send participant list to all clients in session
			h.broadcastParticipants(client.SessionID)

		case client := <-h.unregister:
			h.mu.RLock()
			session, exists := h.sessions[client.SessionID]
			h.mu.RUnlock()

			if exists {
				session.mu.Lock()
				if _, ok := session.Clients[client.ID]; ok {
					delete(session.Clients, client.ID)
					close(client.Send)
					log.Printf("Client %s disconnected from session %s. Remaining: %d",
						client.ID, client.SessionID, len(session.Clients))
				}
				session.mu.Unlock()

				// Clean up empty sessions
				if len(session.Clients) == 0 {
					h.mu.Lock()
					delete(h.sessions, client.SessionID)
					h.mu.Unlock()
					log.Printf("Deleted empty session: %s", client.SessionID)
				} else {
					h.broadcastParticipants(client.SessionID)
				}
			}

		case msg := <-h.broadcast:
			h.mu.RLock()
			session, exists := h.sessions[msg.SessionID]
			h.mu.RUnlock()

			if exists {
				session.mu.RLock()
				for _, client := range session.Clients {
					// Don't send message back to sender
					if client.ID != msg.Sender.ID {
						select {
						case client.Send <- msg.Message:
						default:
							close(client.Send)
							session.mu.RUnlock()
							h.unregister <- client
							session.mu.RLock()
						}
					}
				}
				session.mu.RUnlock()
			}
		}
	}
}

func (h *Hub) broadcastParticipants(sessionID string) {
	h.mu.RLock()
	session, exists := h.sessions[sessionID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	session.mu.RLock()
	participants := make([]Participant, 0, len(session.Clients))
	colorIndex := 0
	for _, client := range session.Clients {
		participants = append(participants, Participant{
			ID:       client.ID,
			Username: client.Username,
			Color:    userColors[colorIndex%len(userColors)],
		})
		colorIndex++
	}
	session.mu.RUnlock()

	outMsg := OutgoingMessage{
		Type:         "participants-update",
		Participants: participants,
	}

	msgBytes, err := json.Marshal(outMsg)
	if err != nil {
		log.Printf("Error marshaling participants: %v", err)
		return
	}

	// Broadcast to all clients in session (including sender for this message)
	session.mu.RLock()
	for _, client := range session.Clients {
		select {
		case client.Send <- msgBytes:
		default:
			log.Printf("Failed to send participants update to client %s", client.ID)
		}
	}
	session.mu.RUnlock()
}

// Read messages from WebSocket and handle them
func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.unregister <- c
		c.Conn.Close()
	}()

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error for client %s: %v", c.ID, err)
			}
			break
		}

		var inMsg IncomingMessage
		if err := json.Unmarshal(message, &inMsg); err != nil {
			log.Printf("Error unmarshaling message from %s: %v", c.ID, err)
			continue
		}

		log.Printf("Received from %s: type=%s", c.ID, inMsg.Type)

		switch inMsg.Type {
		case "join-session":
			// Update username if provided
			if inMsg.Username != "" {
				c.Username = inMsg.Username
				log.Printf("Client %s username set to: %s", c.ID, c.Username)
				// Broadcast updated participant list
				hub.broadcastParticipants(c.SessionID)
			}
			continue

		case "code-change":
			// Broadcast code change to other clients
			outMsg := OutgoingMessage{
				Type:   "code-update",
				UserID: c.ID,
				Code:   inMsg.Code,
			}
			msgBytes, err := json.Marshal(outMsg)
			if err != nil {
				log.Printf("Error marshaling code update: %v", err)
				continue
			}
			hub.broadcast <- &BroadcastMessage{
				SessionID: c.SessionID,
				Message:   msgBytes,
				Sender:    c,
			}

		case "cursor-move":
			// Broadcast cursor position to other clients
			outMsg := OutgoingMessage{
				Type:   "cursor-update",
				UserID: c.ID,
				Cursor: inMsg.Cursor,
			}
			msgBytes, err := json.Marshal(outMsg)
			if err != nil {
				log.Printf("Error marshaling cursor update: %v", err)
				continue
			}
			hub.broadcast <- &BroadcastMessage{
				SessionID: c.SessionID,
				Message:   msgBytes,
				Sender:    c,
			}
		}
	}
}

// Write messages to WebSocket
func (c *Client) writePump() {
	defer func() {
		c.Conn.Close()
	}()

	for message := range c.Send {
		if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("Error writing to client %s: %v", c.ID, err)
			break
		}
	}
}

func handleWebSocket(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionID := c.Param("sessionId")
		log.Printf("WebSocket connection request for session: %s", sessionID)

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("Failed to upgrade connection: %v", err)
			return
		}

		// Generate client ID (in production, use proper UUID)
		clientID := generateClientID()

		client := &Client{
			ID:        clientID,
			Conn:      conn,
			SessionID: sessionID,
			Username:  "User-" + clientID[:8], // Extract username from token in production
			Send:      make(chan []byte, 256),
		}

		hub.register <- client

		// Start read and write pumps
		go client.writePump()
		go client.readPump(hub)
	}
}

func generateClientID() string {
	// Simple ID generation (use UUID in production)
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8002"
	}

	hub := newHub()
	go hub.run()

	router := gin.Default()

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "collab-service",
		})
	})

	// Root
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"service": "collab-service",
			"status":  "running",
			"version": "0.1.0",
		})
	})

	// WebSocket endpoint
	router.GET("/ws/:sessionId", handleWebSocket(hub))

	log.Printf("Collaboration Service starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
