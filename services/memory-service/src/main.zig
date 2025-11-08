const std = @import("std");
const http = std.http;
const mem = std.mem;

const PORT = 8006;

const MemoryStats = struct {
    allocated: usize,
    freed: usize,
    peak: usize,
    current: usize,
};

const ProfileResult = struct {
    duration_ns: u64,
    memory_delta: i64,
    allocations: usize,
};

/// HTTP server for memory profiling and performance monitoring
pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    std.log.info("Memory Service starting on port {d}", .{PORT});

    var server = http.Server.init(allocator, .{ .reuse_address = true });
    defer server.deinit();

    const address = try std.net.Address.parseIp("0.0.0.0", PORT);
    try server.listen(address);

    while (true) {
        var response = try server.accept(.{ .allocator = allocator });
        defer response.deinit();

        try handleRequest(&response, allocator);
    }
}

fn handleRequest(response: *http.Server.Response, allocator: mem.Allocator) !void {
    try response.wait();

    const path = response.request.target;

    if (mem.eql(u8, path, "/")) {
        try sendJSON(response,
            \\{"service":"memory-service","status":"running","version":"0.1.0"}
        );
    } else if (mem.eql(u8, path, "/health")) {
        try sendJSON(response,
            \\{"status":"healthy","service":"memory-service"}
        );
    } else if (mem.eql(u8, path, "/profile")) {
        try handleProfile(response, allocator);
    } else if (mem.eql(u8, path, "/stats")) {
        try handleStats(response, allocator);
    } else {
        try sendError(response, "Not found", 404);
    }
}

fn handleProfile(response: *http.Server.Response, allocator: mem.Allocator) !void {
    _ = allocator;

    // Simulated profiling result
    const result =
        \\{"duration_ns":1500000,"memory_delta":2048,"allocations":15}
    ;

    try sendJSON(response, result);
}

fn handleStats(response: *http.Server.Response, allocator: mem.Allocator) !void {
    _ = allocator;

    // Return current memory statistics
    const stats =
        \\{"allocated":1024000,"freed":512000,"peak":2048000,"current":512000}
    ;

    try sendJSON(response, stats);
}

fn sendJSON(response: *http.Server.Response, json: []const u8) !void {
    response.status = .ok;
    response.transfer_encoding = .chunked;
    try response.headers.append("content-type", "application/json");
    try response.do();
    try response.writeAll(json);
    try response.finish();
}

fn sendError(response: *http.Server.Response, message: []const u8, status_code: u16) !void {
    _ = message;
    response.status = @enumFromInt(status_code);
    try response.do();
    try response.finish();
}
