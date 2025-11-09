"""Session templates for quick-start code snippets"""

TEMPLATES = {
    "python": {
        "hello_world": {
            "name": "Hello World",
            "description": "Simple Hello World program",
            "code": '''def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
'''
        },
        "web_server": {
            "name": "FastAPI Web Server",
            "description": "Basic FastAPI web server",
            "code": '''from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}
'''
        },
        "data_processing": {
            "name": "Data Processing",
            "description": "Pandas data processing example",
            "code": '''import pandas as pd
import numpy as np

# Create sample data
data = {
    'name': ['Alice', 'Bob', 'Charlie', 'David'],
    'age': [25, 30, 35, 28],
    'score': [85, 92, 78, 95]
}

df = pd.DataFrame(data)
print(df)
print(f"\\nAverage score: {df['score'].mean()}")
'''
        }
    },
    "javascript": {
        "hello_world": {
            "name": "Hello World",
            "description": "Simple Hello World program",
            "code": '''console.log("Hello, World!");

function greet(name) {
    return `Hello, ${name}!`;
}

console.log(greet("JavaScript"));
'''
        },
        "express_server": {
            "name": "Express Server",
            "description": "Basic Express.js server",
            "code": '''const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.json({ message: 'Hello, World!' });
});

app.get('/api/users/:id', (req, res) => {
    res.json({ id: req.params.id, name: 'John Doe' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
'''
        },
        "async_fetch": {
            "name": "Async/Await Fetch",
            "description": "Fetch API with async/await",
            "code": '''async function fetchData(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Usage
fetchData('https://api.example.com/data')
    .then(data => console.log(data))
    .catch(error => console.error(error));
'''
        }
    },
    "typescript": {
        "hello_world": {
            "name": "Hello World",
            "description": "TypeScript Hello World with types",
            "code": '''interface User {
    name: string;
    age: number;
}

function greet(user: User): string {
    return `Hello, ${user.name}! You are ${user.age} years old.`;
}

const user: User = { name: "TypeScript", age: 10 };
console.log(greet(user));
'''
        },
        "react_component": {
            "name": "React Component",
            "description": "TypeScript React functional component",
            "code": '''import React, { useState } from 'react';

interface Props {
    title: string;
    initialCount?: number;
}

const Counter: React.FC<Props> = ({ title, initialCount = 0 }) => {
    const [count, setCount] = useState(initialCount);

    return (
        <div>
            <h2>{title}</h2>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>
                Increment
            </button>
        </div>
    );
};

export default Counter;
'''
        }
    },
    "go": {
        "hello_world": {
            "name": "Hello World",
            "description": "Simple Go program",
            "code": '''package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
    
    message := greet("Go")
    fmt.Println(message)
}

func greet(name string) string {
    return fmt.Sprintf("Hello, %s!", name)
}
'''
        },
        "http_server": {
            "name": "HTTP Server",
            "description": "Basic Go HTTP server",
            "code": '''package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
)

type Response struct {
    Message string `json:"message"`
}

func handler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(Response{Message: "Hello, World!"})
}

func main() {
    http.HandleFunc("/", handler)
    fmt.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
'''
        }
    },
    "rust": {
        "hello_world": {
            "name": "Hello World",
            "description": "Simple Rust program",
            "code": '''fn main() {
    println!("Hello, World!");
    
    let message = greet("Rust");
    println!("{}", message);
}

fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
'''
        },
        "struct_example": {
            "name": "Struct and Methods",
            "description": "Rust struct with methods",
            "code": '''struct Person {
    name: String,
    age: u32,
}

impl Person {
    fn new(name: String, age: u32) -> Person {
        Person { name, age }
    }
    
    fn introduce(&self) -> String {
        format!("Hi, I'm {} and I'm {} years old.", self.name, self.age)
    }
}

fn main() {
    let person = Person::new(String::from("Alice"), 30);
    println!("{}", person.introduce());
}
'''
        }
    }
}


def get_template(language: str, template_id: str):
    """Get a specific template by language and ID"""
    return TEMPLATES.get(language, {}).get(template_id)


def list_templates(language: str = None):
    """List all templates or templates for a specific language"""
    if language:
        return {language: TEMPLATES.get(language, {})}
    return TEMPLATES
