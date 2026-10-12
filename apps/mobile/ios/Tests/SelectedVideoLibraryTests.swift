import XCTest
@testable import AIEVStudio

final class SelectedVideoLibraryTests: XCTestCase {
    @MainActor func testSelectionIsolationRevocationAndAtomicFailure() throws {
        let base = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: base) }
        let source = base.appendingPathComponent("holiday.mov")
        try Data(repeating: 1, count: 200).write(to: source)
        let library = SelectedVideoLibrary(root: base.appendingPathComponent("copies"))
        try library.replace([source], owner: "first")
        let id = try XCTUnwrap(library.entries.first?.id)
        XCTAssertEqual(id.count, 32)
        let copy = try XCTUnwrap(library.resolve([id]).first)
        XCTAssertNotEqual(copy, source)
        XCTAssertThrowsError(try library.resolve(["../../holiday.mov"]))
        XCTAssertThrowsError(try library.resolve([id, id]))
        XCTAssertThrowsError(try library.replace([base.appendingPathComponent("missing.mov")], owner: "first"))
        XCTAssertEqual(try library.resolve([id]), [copy], "Failed selections preserve previously granted sources")
        try library.useAccount("second")
        XCTAssertEqual(library.entries.count, 0)
        XCTAssertThrowsError(try library.resolve([id]))
        XCTAssertFalse(FileManager.default.fileExists(atPath: copy.path))
        XCTAssertTrue(FileManager.default.fileExists(atPath: source.path), "Revocation never deletes original media")
        try library.replace([source], owner: "second")
        try library.revoke()
        XCTAssertEqual(library.summary()["total"] as? Int, 0)
    }
}
