//! Compile with the registry and registry_index modules from Bitcadia64.
const std = @import("std");
const registry = @import("registry");
const index = @import("registry_index");
const selection = @import("selection");
pub fn main(init: std.process.Init.Minimal) !void {
    var threaded: std.Io.Threaded = .init(std.heap.page_allocator, .{ .environ = init.environ });
    defer threaded.deinit();
    const a = std.heap.page_allocator;
    const args = try init.args.toSlice(a);
    if (args.len != 3) return error.ExpectedTypeAndFile;
    const data = try std.Io.Dir.cwd().readFileAlloc(threaded.io(), args[2], a, .limited(64 * 1024 * 1024));
    defer a.free(data);
    if (std.mem.eql(u8, args[1], "release-pairs")) {
        const Entry = struct { entrySha256: []const u8, outputSha256: []const u8 };
        const Pair = struct { left: Entry, right: Entry };
        const pairs = try std.json.parseFromSlice([]Pair, a, data, .{});
        defer pairs.deinit();
        for (pairs.value) |pair| {
            if (!std.mem.eql(u8, pair.left.outputSha256, pair.right.outputSha256)) return error.ExpectedSharedOutput;
            const left = try selection.releaseIdentity(pair.left.entrySha256, pair.left.outputSha256);
            const right = try selection.releaseIdentity(pair.right.entrySha256, pair.right.outputSha256);
            if (std.mem.eql(u8, &left, &right) != std.mem.eql(u8, pair.left.entrySha256, pair.right.entrySha256)) return error.ReleaseIdentityMismatch;
        }
        std.debug.print("Checked {d} cross-catalog shared-output pairs\n", .{pairs.value.len});
    } else if (std.mem.eql(u8, args[1], "index")) {
        var parsed = try index.parse(a, data);
        defer parsed.deinit();
        std.debug.print("Accepted index: {d} games\n", .{parsed.games().len});
    } else {
        var parsed = try registry.parse(a, data);
        defer parsed.deinit();
        std.debug.print("Accepted registry: {d} entries\n", .{parsed.entries().len});
        var shared_outputs: usize = 0;
        for (parsed.entries(), 0..) |entry, i| {
            for (parsed.entries()[0..i]) |previous| {
                if (!std.mem.eql(u8, entry.output.sha256, previous.output.sha256)) continue;
                const current_identity = try selection.releaseIdentity(entry.entrySha256, entry.output.sha256);
                const previous_identity = try selection.releaseIdentity(previous.entrySha256, previous.output.sha256);
                const same_entry = std.mem.eql(u8, entry.entrySha256, previous.entrySha256);
                if (std.mem.eql(u8, &current_identity, &previous_identity) != same_entry) return error.ReleaseIdentityMismatch;
                shared_outputs += 1;
            }
        }
        std.debug.print("Checked {d} shared-output pairs with client release identities\n", .{shared_outputs});
    }
}
