import React, { useState } from 'react';

interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  code: string;
  category: string;
}

interface CodeTemplatesProps {
  onSelectTemplate: (code: string, language: string) => void;
}

const codeTemplates: CodeTemplate[] = [
  // Python Templates
  {
    id: 'py-flask-api',
    name: 'Flask REST API',
    description: 'Basic Flask REST API with route',
    language: 'python',
    category: 'Web',
    code: `from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify({'message': 'Hello, World!', 'status': 'success'})

@app.route('/api/data', methods=['POST'])
def create_data():
    data = request.get_json()
    return jsonify({'received': data, 'status': 'created'}), 201

if __name__ == '__main__':
    app.run(debug=True)`,
  },
  {
    id: 'py-async',
    name: 'Async/Await Pattern',
    description: 'Python async function with asyncio',
    language: 'python',
    category: 'Async',
    code: `import asyncio
import aiohttp

async def fetch_data(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()

async def main():
    url = 'https://api.example.com/data'
    result = await fetch_data(url)
    print(result)

if __name__ == '__main__':
    asyncio.run(main())`,
  },
  // JavaScript/TypeScript Templates
  {
    id: 'js-express-api',
    name: 'Express.js API',
    description: 'Express server with middleware',
    language: 'javascript',
    category: 'Web',
    code: `const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/users', (req, res) => {
  res.json({ users: [], message: 'Users fetched' });
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  res.status(201).json({ id: 1, name, email });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
  },
  {
    id: 'ts-react-component',
    name: 'React TypeScript Component',
    description: 'Functional component with hooks',
    language: 'typescript',
    category: 'React',
    code: `import React, { useState, useEffect } from 'react';

interface Props {
  title: string;
  onAction?: () => void;
}

const MyComponent: React.FC<Props> = ({ title, onAction }) => {
  const [count, setCount] = useState(0);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Fetch data on mount
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data');
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="container">
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};

export default MyComponent;`,
  },
  // Go Templates
  {
    id: 'go-http-server',
    name: 'Go HTTP Server',
    description: 'Basic HTTP server with routes',
    language: 'go',
    category: 'Web',
    code: `package main

import (
    "encoding/json"
    "log"
    "net/http"
)

type Response struct {
    Message string \`json:"message"\`
    Status  string \`json:"status"\`
}

func handleGet(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(Response{
        Message: "Hello, World!",
        Status:  "success",
    })
}

func main() {
    http.HandleFunc("/api/data", handleGet)
    
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}`,
  },
  // Rust Templates
  {
    id: 'rust-web-server',
    name: 'Actix Web Server',
    description: 'Rust web server with Actix',
    language: 'rust',
    category: 'Web',
    code: `use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct ApiResponse {
    message: String,
    status: String,
}

#[get("/api/data")]
async fn get_data() -> impl Responder {
    HttpResponse::Ok().json(ApiResponse {
        message: "Hello, World!".to_string(),
        status: "success".to_string(),
    })
}

#[post("/api/data")]
async fn create_data(data: web::Json<serde_json::Value>) -> impl Responder {
    HttpResponse::Created().json(ApiResponse {
        message: format!("Received: {:?}", data),
        status: "created".to_string(),
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(get_data)
            .service(create_data)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}`,
  },
  // Algorithm Templates
  {
    id: 'algo-binary-search',
    name: 'Binary Search',
    description: 'Binary search algorithm',
    language: 'python',
    category: 'Algorithms',
    code: `def binary_search(arr, target):
    """
    Binary search algorithm - O(log n)
    """
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1  # Not found

# Example usage
arr = [1, 3, 5, 7, 9, 11, 13, 15]
target = 7
result = binary_search(arr, target)
print(f"Element found at index: {result}")`,
  },
  {
    id: 'algo-quicksort',
    name: 'Quick Sort',
    description: 'Quick sort algorithm',
    language: 'javascript',
    category: 'Algorithms',
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

// Example usage
const numbers = [64, 34, 25, 12, 22, 11, 90];
const sorted = quickSort(numbers);
console.log('Sorted array:', sorted);`,
  },
];

const CodeTemplates: React.FC<CodeTemplatesProps> = ({ onSelectTemplate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', ...Array.from(new Set(codeTemplates.map(t => t.category)))];

  const filteredTemplates = codeTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.language.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectTemplate = (template: CodeTemplate) => {
    onSelectTemplate(template.code, template.language);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 p-4 bg-cyan-500 hover:bg-cyan-400 text-black shadow-neon hover:shadow-neon-lg transition-all hover:scale-110 z-40 font-mono"
        title="Code Templates"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-black border-2 border-green-500 shadow-neon max-w-5xl w-full max-h-[85vh] flex flex-col font-mono">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-green-500/30">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 border border-green-500/50">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-400 neon-glow">CODE_TEMPLATES_</h2>
              <p className="text-sm text-green-600">// choose a template to get started quickly</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-green-500/20 border border-transparent hover:border-green-500 transition-colors text-green-500 hover:text-red-500"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-6 border-b border-green-500/30 space-y-4">
          <input
            type="text"
            placeholder="// search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-black border border-green-500/50 text-green-400 placeholder-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-400"
          />
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 text-sm font-semibold transition-all ${
                  selectedCategory === category
                    ? 'bg-green-500 text-black shadow-neon'
                    : 'bg-black text-green-400 border border-green-500/50 hover:border-green-400'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-black">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="group p-4 bg-black hover:bg-green-500/10 border border-green-500/30 hover:border-green-500 cursor-pointer transition-all hover:shadow-neon"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-green-400 group-hover:neon-glow transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-sm text-green-600">// {template.description}</p>
                  </div>
                  <svg className="w-5 h-5 text-green-700 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/50 text-xs font-semibold">
                    {template.language}
                  </span>
                  <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-semibold">
                    {template.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-green-600">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-semibold">// no templates found</p>
              <p className="text-sm">// try adjusting your search or category filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeTemplates;
