//! Compile with the registry and registry_index modules from Bitcadia64.
const std = @import("std");
const registry = @import("registry");
const index = @import("registry_index");
pub fn main(init: std.process.Init.Minimal) !void {
    var threaded: std.Io.Threaded = .init(std.heap.page_allocator, .{ .environ = init.environ });
    defer threaded.deinit();
    const a = std.heap.page_allocator;
    const args = try init.args.toSlice(a);
    if (args.len != 3) return error.ExpectedTypeAndFile;
    const data = try std.Io.Dir.cwd().readFileAlloc(threaded.io(), args[2], a, .limited(64 * 1024 * 1024));
    defer a.free(data);
    if (std.mem.eql(u8, args[1], "index")) {
        var parsed = try index.parse(a, data);
        defer parsed.deinit();
        std.debug.print("Accepted index: {d} games\n", .{parsed.games().len});
    } else {
        var parsed = try registry.parse(a, data);
        defer parsed.deinit();
        std.debug.print("Accepted registry: {d} entries\n", .{parsed.entries().len});
    }
}
