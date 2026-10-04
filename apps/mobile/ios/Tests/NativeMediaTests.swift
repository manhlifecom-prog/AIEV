import XCTest
import AVFoundation
import UIKit
@testable import AIEVStudio

final class NativeMediaTests: XCTestCase {
    @MainActor func testLocalMergeRenderAndAudioChunk() async throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: dir) }
        let red = dir.appendingPathComponent("red.mp4"), blue = dir.appendingPathComponent("blue.mp4"), withAudio = dir.appendingPathComponent("audio.mp4")
        print("AIEV media check: generating two source clips")
        try await fixture(red, color: .red, rotated: false)
        try await fixture(blue, color: .blue, rotated: true)
        print("AIEV media check: source clips written; attaching audio")
        try await addingAudio(red, output: withAudio, directory: dir)
        let media = NativeMedia(), source = dir.appendingPathComponent("source.mp4")
        media.activity = { print("AIEV media check: \($0)") }
        let metadata = try await media.merge([(withAudio, "Lời thoại"), (blue, "Clip dọc không âm thanh")], output: source)
        XCTAssertEqual(metadata.sources?.count, 2); XCTAssertEqual(metadata.duration, 4, accuracy: 0.1)
        XCTAssertEqual(metadata.sources?[1].start ?? 0, 2, accuracy: 0.1)
        XCTAssertTrue(metadata.hasAudio); XCTAssertEqual(metadata.sources?[1].hasAudio, false)
        let final = dir.appendingPathComponent("final.mp4")
        let edit = NativeEdit(title: "AIEV iPhone", ratio: "1:1", subtitles: true, segments: [EditSegment(start: 0.5, end: 1.5), EditSegment(start: 2.5, end: 3.5)])
        try await media.render(source, plan: NativePlan(edit: edit, words: [NativeWord(word: "Kiểm tra phụ đề", start: 0.5, end: 1.5)], hasAudio: true), output: final)
        let rendered = try await media.probe(final)
        XCTAssertEqual(rendered.width, 1080); XCTAssertEqual(rendered.height, 1080)
        XCTAssertEqual(rendered.duration, 2, accuracy: 0.1); XCTAssertTrue(rendered.hasAudio)
        let generator = AVAssetImageGenerator(asset: AVURLAsset(url: final)); generator.appliesPreferredTrackTransform = true
        let image = try generator.copyCGImage(at: CMTime(seconds: 0.5, preferredTimescale: 600), actualTime: nil)
        let attachment = XCTAttachment(image: UIImage(cgImage: image)); attachment.lifetime = .keepAlways; add(attachment)
        let firstPixels = try pixels(image)
        XCTAssertGreaterThan(firstPixels.center[0], firstPixels.center[2] + 80, "First selected clip stays red")
        XCTAssertGreaterThan(firstPixels.upperWhite, 100, "Title or subtitle is visible above the video")
        XCTAssertGreaterThan(firstPixels.lowerWhite, 100, "Both title and subtitle must be burned into the MP4")
        let secondImage = try generator.copyCGImage(at: CMTime(seconds: 1.5, preferredTimescale: 600), actualTime: nil)
        let secondPixels = try pixels(secondImage)
        XCTAssertGreaterThan(secondPixels.center[2], secondPixels.center[0] + 80, "Rotated second clip stays blue")
        let audio = dir.appendingPathComponent("speech.m4a")
        print("AIEV media check: extracting offset speech chunk")
        try await media.speech(source, start: 0.5, seconds: 1, output: audio)
        let audioAsset = AVURLAsset(url: audio)
        let speechDuration = try await audioAsset.load(.duration).seconds
        let speechTracks = try await audioAsset.loadTracks(withMediaType: .audio)
        XCTAssertEqual(speechDuration, 1, accuracy: 0.15)
        XCTAssertFalse(speechTracks.isEmpty)
        XCTAssertLessThan(try Data(contentsOf: audio).count, 5 * 1024 * 1024)
    }
    private func pixels(_ image: CGImage) throws -> (center: [Int], upperWhite: Int, lowerWhite: Int) {
        let width = image.width, height = image.height
        var bytes = [UInt8](repeating: 0, count: width * height * 4)
        let rendered = bytes.withUnsafeMutableBytes { buffer -> Bool in
            guard let context = CGContext(data: buffer.baseAddress, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue) else { return false }
            context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
            return true
        }
        guard rendered else { throw NativeFailure(message: "Cannot inspect rendered caption pixels") }
        func white(_ range: Range<Int>) -> Int {
            var count = 0
            for y in range { for x in 60..<(width - 60) {
                let i = (y * width + x) * 4
                if bytes[i] > 210 && bytes[i + 1] > 210 && bytes[i + 2] > 210 { count += 1 }
            } }
            return count
        }
        let center = (height / 2 * width + width / 2) * 4
        return (bytes[center..<(center + 3)].map(Int.init), white(80..<300), white((height - 300)..<(height - 80)))
    }
    @MainActor func testSilentFolderKeepsVideoWithoutInventingAudio() async throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: dir) }
        let first = dir.appendingPathComponent("first.mp4"), second = dir.appendingPathComponent("second.mp4"), output = dir.appendingPathComponent("source.mp4")
        try await fixture(first, color: .red, rotated: false)
        try await fixture(second, color: .blue, rotated: true)
        let media = NativeMedia(), metadata = try await media.merge([(first, "A"), (second, "B")], output: output)
        let actual = try await media.probe(output)
        XCTAssertFalse(metadata.hasAudio); XCTAssertFalse(actual.hasAudio)
        XCTAssertEqual(actual.duration, 4, accuracy: 0.1)
    }
    func testBoundedPlanAndOrigins() throws {
        let invalid = NativeEdit(title: "", ratio: "9:16", subtitles: false, segments: [EditSegment(start: 0, end: 10)])
        XCTAssertThrowsError(try invalid.validate(duration: 2))
        XCTAssertTrue(StudioOrigin.trusted(URL(string: "https://video.manh.marketing/studio")))
        for value in ["http://video.manh.marketing", "https://video.manh.marketing.evil.invalid", "https://user@video.manh.marketing", "https://video.manh.marketing:444"] { XCTAssertFalse(StudioOrigin.trusted(URL(string: value))) }
        XCTAssertTrue(StudioOrigin.google(URL(string: "https://drive.usercontent.google.com/download")))
        XCTAssertFalse(StudioOrigin.google(URL(string: "https://evilgoogleusercontent.com")))
    }
    private func fixture(_ output: URL, color: UIColor, rotated: Bool) async throws {
        let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
        defer { if writer.status == .writing { writer.cancelWriting() } }
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: 320, AVVideoHeightKey: 180])
        if rotated { input.transform = CGAffineTransform(rotationAngle: .pi / 2) }
        let adapter = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: 320, kCVPixelBufferHeightKey as String: 180])
        writer.add(input)
        guard writer.startWriting() else { throw writer.error ?? NativeFailure(message: "Fixture writer did not start") }
        writer.startSession(atSourceTime: .zero)
        for index in 0..<60 {
            // The simulator's first hardware codec startup can take over 15s
            // while WebKit launches; bound the wait without abandoning a writer.
            let deadline = Date().addingTimeInterval(60)
            while !input.isReadyForMoreMediaData {
                guard writer.status == .writing, Date() < deadline else { throw writer.error ?? NativeFailure(message: "Fixture encoder stopped accepting frames") }
                try await Task.sleep(nanoseconds: 1_000_000)
            }
            var buffer: CVPixelBuffer?; CVPixelBufferCreate(kCFAllocatorDefault, 320, 180, kCVPixelFormatType_32ARGB, nil, &buffer)
            guard let buffer else { throw NativeFailure(message: "Fixture buffer missing") }
            CVPixelBufferLockBaseAddress(buffer, [])
            let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: 320, height: 180, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
            context.setFillColor(color.cgColor); context.fill(CGRect(x: 0, y: 0, width: 320, height: 180))
            CVPixelBufferUnlockBaseAddress(buffer, [])
            guard adapter.append(buffer, withPresentationTime: CMTime(value: Int64(index), timescale: 30)) else { throw writer.error ?? NativeFailure(message: "Fixture append failed") }
        }
        input.markAsFinished()
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in writer.finishWriting { if writer.status == .completed { continuation.resume() } else { continuation.resume(throwing: writer.error ?? NativeFailure(message: "Fixture failed")) } } }
    }
    private func addingAudio(_ video: URL, output: URL, directory: URL) async throws {
        let format = AVAudioFormat(standardFormatWithSampleRate: 16000, channels: 1)!
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 32000)!; buffer.frameLength = 32000
        for index in 0..<32000 { buffer.floatChannelData![0][index] = Float(sin(Double(index) * 2 * .pi * 440 / 16000) * 0.2) }
        let audioURL = directory.appendingPathComponent("fixture.caf"), audioFile = try AVAudioFile(forWriting: audioURL, settings: format.settings)
        try audioFile.write(from: buffer)
        let videoAsset = AVURLAsset(url: video), audioAsset = AVURLAsset(url: audioURL), composition = AVMutableComposition()
        let videoTrack = try await videoAsset.loadTracks(withMediaType: .video)[0], audioTrack = try await audioAsset.loadTracks(withMediaType: .audio)[0]
        let range = CMTimeRange(start: .zero, duration: CMTime(seconds: 2, preferredTimescale: 600))
        try composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!.insertTimeRange(range, of: videoTrack, at: .zero)
        try composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!.insertTimeRange(range, of: audioTrack, at: .zero)
        let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality)!
        exporter.outputURL = output; exporter.outputFileType = .mp4
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in exporter.exportAsynchronously { if exporter.status == .completed { continuation.resume() } else { continuation.resume(throwing: exporter.error ?? NativeFailure(message: "Fixture audio failed")) } } }
    }
}
