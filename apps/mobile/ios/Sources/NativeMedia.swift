@preconcurrency import AVFoundation
import UIKit

struct NativeFailure: LocalizedError {
    var message: String
    var status = 400
    var errorDescription: String? { message }
}
struct ClipInfo: Codable {
    var name: String
    var start: Double
    var duration: Double
    var hasAudio: Bool
}
struct MediaInfo: Codable {
    var duration: Double
    var bytes: Int64
    var width: Int
    var height: Int
    var hasAudio: Bool
    var sources: [ClipInfo]?
}
struct EditSegment: Codable { var start: Double; var end: Double }
struct NativeEdit: Codable {
    var title: String
    var ratio: String
    var subtitles: Bool
    var segments: [EditSegment]
    func validate(duration: Double) throws {
        guard title.count <= 100, ["16:9", "9:16", "1:1"].contains(ratio), !segments.isEmpty, segments.count <= 50 else { throw NativeFailure(message: "Kế hoạch AI không hợp lệ") }
        var total = 0.0
        for segment in segments {
            guard segment.start.isFinite, segment.end.isFinite, segment.start >= 0, segment.end <= duration + 0.05, segment.end - segment.start >= 0.3 else { throw NativeFailure(message: "Đoạn dựng nằm ngoài video nguồn") }
            total += segment.end - segment.start
        }
        guard total <= duration + 0.1 else { throw NativeFailure(message: "Kế hoạch vượt thời lượng đã báo giá") }
    }
}
struct NativeWord: Codable { var word: String; var start: Double; var end: Double }
struct NativePlan: Codable { var edit: NativeEdit; var words: [NativeWord]; var hasAudio: Bool }

@MainActor final class NativeMedia {
    var activity: (String) -> Void = { _ in }
    private let scale: CMTimeScale = 600
    private func time(_ seconds: Double) -> CMTime { CMTime(seconds: seconds, preferredTimescale: scale) }

    func probe(_ url: URL) async throws -> MediaInfo {
        let asset = AVURLAsset(url: url)
        let duration = try await asset.load(.duration).seconds
        guard duration.isFinite, duration > 0, let video = try await asset.loadTracks(withMediaType: .video).first else { throw NativeFailure(message: "iPhone không đọc được video này. Hãy dùng MP4/MOV/M4V hoặc app Mac/Windows.") }
        let natural = try await video.load(.naturalSize), transform = try await video.load(.preferredTransform)
        let size = CGRect(origin: .zero, size: natural).applying(transform).size
        let values = try url.resourceValues(forKeys: [.fileSizeKey])
        return MediaInfo(duration: duration, bytes: Int64(values.fileSize ?? 0), width: Int(abs(size.width).rounded()), height: Int(abs(size.height).rounded()), hasAudio: !(try await asset.loadTracks(withMediaType: .audio)).isEmpty)
    }
    private func fitted(_ track: AVAssetTrack, to size: CGSize) async throws -> CGAffineTransform {
        let natural = try await track.load(.naturalSize), preferred = try await track.load(.preferredTransform)
        let bounds = CGRect(origin: .zero, size: natural).applying(preferred)
        let factor = min(size.width / abs(bounds.width), size.height / abs(bounds.height))
        return preferred.concatenating(CGAffineTransform(translationX: -bounds.minX, y: -bounds.minY))
            .concatenating(CGAffineTransform(scaleX: factor, y: factor))
            .concatenating(CGAffineTransform(translationX: (size.width - abs(bounds.width) * factor) / 2, y: (size.height - abs(bounds.height) * factor) / 2))
    }
    func merge(_ files: [(URL, String)], output: URL) async throws -> MediaInfo {
        guard !files.isEmpty else { throw NativeFailure(message: "Thư mục không có video") }
        let first = try await probe(files[0].0)
        let size = first.height > first.width ? CGSize(width: 1080, height: 1920) : CGSize(width: 1920, height: 1080)
        let composition = AVMutableComposition()
        guard let audio = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else { throw NativeFailure(message: "Không tạo được bộ dựng") }
        var instructions = [AVMutableVideoCompositionInstruction](), clips = [ClipInfo](), offset = 0.0, bytes: Int64 = 0
        for (index, file) in files.enumerated() {
            activity("Chuẩn hóa clip \(index + 1)/\(files.count): \(file.1)")
            let metadata = try await probe(file.0), asset = AVURLAsset(url: file.0)
            guard let source = try await asset.loadTracks(withMediaType: .video).first,
                  let video = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else { throw NativeFailure(message: "Không đọc được clip \(file.1)") }
            let range = CMTimeRange(start: .zero, duration: time(metadata.duration))
            try video.insertTimeRange(range, of: source, at: time(offset))
            if let sourceAudio = try await asset.loadTracks(withMediaType: .audio).first {
                let audioRange = try await sourceAudio.load(.timeRange)
                let available = CMTimeRangeGetIntersection(range, otherRange: audioRange)
                if available.duration.seconds > 0 { try audio.insertTimeRange(available, of: sourceAudio, at: time(offset + available.start.seconds)) }
            }
            let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: video)
            layer.setTransform(try await fitted(source, to: size), at: time(offset))
            let instruction = AVMutableVideoCompositionInstruction()
            instruction.timeRange = CMTimeRange(start: time(offset), duration: time(metadata.duration))
            instruction.backgroundColor = UIColor.black.cgColor
            instruction.layerInstructions = [layer]; instructions.append(instruction)
            clips.append(ClipInfo(name: String(file.1.prefix(500)), start: offset, duration: metadata.duration, hasAudio: metadata.hasAudio))
            offset += metadata.duration; bytes += metadata.bytes
        }
        let videoComposition = AVMutableVideoComposition()
        videoComposition.renderSize = size; videoComposition.frameDuration = CMTime(value: 1, timescale: 30); videoComposition.instructions = instructions
        activity("Đang ghép nguồn trên iPhone/iPad")
        try await export(composition, videoComposition: videoComposition, output: output)
        var result = try await probe(output)
        result.bytes = bytes; result.sources = clips; result.hasAudio = clips.contains(where: { $0.hasAudio })
        guard abs(result.duration - offset) <= max(0.5, Double(clips.count) * 0.05) else { throw NativeFailure(message: "Thời lượng nguồn ghép chưa đạt kiểm tra") }
        return result
    }
    func render(_ sourceURL: URL, plan: NativePlan, output: URL) async throws {
        let metadata = try await probe(sourceURL); try plan.edit.validate(duration: metadata.duration)
        let source = AVURLAsset(url: sourceURL)
        guard let videoSource = try await source.loadTracks(withMediaType: .video).first else { throw NativeFailure(message: "Không tìm thấy video nguồn") }
        let audioSource = try await source.loadTracks(withMediaType: .audio).first
        let composition = AVMutableComposition()
        guard let video = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else { throw NativeFailure(message: "Không tạo được bộ dựng") }
        let audio = audioSource == nil ? nil : composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
        var offset = 0.0
        for segment in plan.edit.segments {
            let range = CMTimeRange(start: time(segment.start), duration: time(segment.end - segment.start))
            try video.insertTimeRange(range, of: videoSource, at: time(offset))
            if let audioSource, let audio {
                let available = CMTimeRangeGetIntersection(range, otherRange: try await audioSource.load(.timeRange))
                if available.duration.seconds > 0 { try audio.insertTimeRange(available, of: audioSource, at: time(offset + available.start.seconds - segment.start)) }
            }
            offset += range.duration.seconds
        }
        let size = plan.edit.ratio == "9:16" ? CGSize(width: 1080, height: 1920) : plan.edit.ratio == "1:1" ? CGSize(width: 1080, height: 1080) : CGSize(width: 1920, height: 1080)
        let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: video)
        layerInstruction.setTransform(try await fitted(videoSource, to: size), at: .zero)
        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = CMTimeRange(start: .zero, duration: time(offset)); instruction.layerInstructions = [layerInstruction]; instruction.backgroundColor = UIColor.black.cgColor
        let videoComposition = AVMutableVideoComposition()
        videoComposition.renderSize = size; videoComposition.frameDuration = CMTime(value: 1, timescale: 30); videoComposition.instructions = [instruction]
        let parent = CALayer(), videoLayer = CALayer()
        parent.frame = CGRect(origin: .zero, size: size); videoLayer.frame = parent.bounds
        parent.addSublayer(videoLayer)
        if !plan.edit.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            parent.addSublayer(caption(plan.edit.title, start: 0, end: min(4, offset), size: size, title: true))
        }
        offset = 0
        if plan.edit.subtitles {
            for segment in plan.edit.segments {
                let words = plan.words.filter { $0.end > segment.start && $0.start < segment.end }
                for i in stride(from: 0, to: words.count, by: 6) {
                    let chunk = Array(words[i..<min(i + 6, words.count)])
                    let start = offset + max(0, chunk[0].start - segment.start)
                    let end = offset + min(segment.end - segment.start, chunk[chunk.count - 1].end - segment.start)
                    if end > start { parent.addSublayer(caption(chunk.map(\.word).joined(separator: " "), start: start, end: end, size: size, title: false)) }
                }
                offset += segment.end - segment.start
            }
        }
        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parent)
        activity("Đang xuất MP4 trên iPhone/iPad")
        try await export(composition, videoComposition: videoComposition, output: output)
        let final = try await probe(output), expected = plan.edit.segments.reduce(0) { $0 + $1.end - $1.start }
        guard abs(final.duration - expected) <= 1, final.width == Int(size.width), final.height == Int(size.height), final.bytes > 1000 else { throw NativeFailure(message: "Video xuất chưa đạt kiểm tra") }
    }
    private func caption(_ text: String, start: Double, end: Double, size: CGSize, title: Bool) -> CALayer {
        let layer = CATextLayer()
        layer.string = String(text.prefix(250)); layer.font = UIFont.boldSystemFont(ofSize: title ? 56 : 48); layer.fontSize = title ? 56 : 48
        layer.alignmentMode = .center; layer.isWrapped = true; layer.foregroundColor = UIColor.white.cgColor
        layer.backgroundColor = UIColor.black.withAlphaComponent(0.55).cgColor; layer.cornerRadius = 12; layer.contentsScale = 2
        layer.frame = CGRect(x: 60, y: title ? size.height - 230 : size.height * 0.1, width: size.width - 120, height: 150)
        layer.opacity = 0
        let animation = CAKeyframeAnimation(keyPath: "opacity")
        animation.values = [0, 1, 1, 0]; animation.keyTimes = [0, 0.001, 0.999, 1]
        animation.beginTime = AVCoreAnimationBeginTimeAtZero + start; animation.duration = end - start
        animation.calculationMode = .discrete; animation.isRemovedOnCompletion = false; animation.fillMode = .both
        layer.add(animation, forKey: "caption")
        return layer
    }
    private func export(_ asset: AVAsset, videoComposition: AVVideoComposition, output: URL) async throws {
        if FileManager.default.fileExists(atPath: output.path) { try FileManager.default.removeItem(at: output) }
        guard let exporter = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetHighestQuality) else { throw NativeFailure(message: "Không tạo được phiên xuất video") }
        exporter.outputURL = output; exporter.outputFileType = .mp4; exporter.shouldOptimizeForNetworkUse = true; exporter.videoComposition = videoComposition
        let progress = Task { @MainActor in
            while !Task.isCancelled { try? await Task.sleep(nanoseconds: 1_000_000_000); if !Task.isCancelled { self.activity("Xuất video tại thiết bị: \(Int(exporter.progress * 100))%") } }
        }
        defer { progress.cancel() }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            exporter.exportAsynchronously {
                if exporter.status == .completed { continuation.resume() }
                else { continuation.resume(throwing: exporter.error ?? NativeFailure(message: "Xuất video bị gián đoạn. Mở app và thử lại.")) }
            }
        }
    }
    // AAC 48 kbps: a ten-minute speech chunk fits the existing 5 MB API cap.
    func speech(_ source: URL, start: Double, seconds: Double, output: URL) async throws {
        let asset = AVURLAsset(url: source), tracks = try await asset.loadTracks(withMediaType: .audio)
        guard !tracks.isEmpty else { throw NativeFailure(message: "Không đọc được âm thanh") }
        try? FileManager.default.removeItem(at: output)
        let reader = try AVAssetReader(asset: asset)
        reader.timeRange = CMTimeRange(start: time(start), duration: time(seconds))
        let readerOutput = AVAssetReaderAudioMixOutput(audioTracks: tracks, audioSettings: [AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: 16000, AVNumberOfChannelsKey: 1, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false])
        guard reader.canAdd(readerOutput) else { throw NativeFailure(message: "Không chuyển được âm thanh") }; reader.add(readerOutput)
        let writer = try AVAssetWriter(outputURL: output, fileType: .m4a)
        let input = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 16000, AVNumberOfChannelsKey: 1, AVEncoderBitRateKey: 48000])
        guard writer.canAdd(input) else { throw NativeFailure(message: "Không tạo được âm thanh gửi AI") }; writer.add(input)
        guard writer.startWriting(), reader.startReading() else { throw reader.error ?? writer.error ?? NativeFailure(message: "Không bắt đầu được chuyển âm thanh") }
        writer.startSession(atSourceTime: time(start))
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            let queue = DispatchQueue(label: "marketing.manh.aiev.audio"), state = AudioPumpState()
            input.requestMediaDataWhenReady(on: queue) {
                guard !state.finished else { return }
                while input.isReadyForMoreMediaData {
                    guard let sample = readerOutput.copyNextSampleBuffer() else {
                        state.finished = true; input.markAsFinished()
                        if reader.status == .failed { writer.cancelWriting(); continuation.resume(throwing: reader.error ?? NativeFailure(message: "Đọc âm thanh thất bại")); return }
                        writer.finishWriting { if writer.status == .completed { continuation.resume() } else { continuation.resume(throwing: writer.error ?? NativeFailure(message: "Ghi âm thanh thất bại")) } }; return
                    }
                    if !input.append(sample) { state.finished = true; reader.cancelReading(); writer.cancelWriting(); continuation.resume(throwing: writer.error ?? NativeFailure(message: "Chuyển âm thanh thất bại")); return }
                }
            }
        }
        let bytes = try output.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard bytes >= 100, bytes <= 5 * 1024 * 1024 else { throw NativeFailure(message: "Đoạn âm thanh không hợp lệ") }
    }
}
// This flag is confined to the single serial requestMediaDataWhenReady queue.
private final class AudioPumpState: @unchecked Sendable { var finished = false }
