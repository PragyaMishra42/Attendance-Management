import type { DetectedFaceMatch, FaceRecognitionResult, StudentItem } from "@/types";

export interface FaceRecognitionProvider {
  readonly name: string;
  readonly isMock: boolean;
  identifyFaces(
    imageDataUrl: string,
    authorizedStudents: StudentItem[]
  ): Promise<FaceRecognitionResult>;
}

/**
 * Clearly labelled Mock Face Recognition Provider for demonstration when no external
 * AI / biometric API is configured.
 *
 * PRIVACY & SAFETY:
 * - Only considers students who have `guardianConsent === true`.
 * - Never marks attendance automatically; all matches require explicit teacher verification.
 */
class MockFaceRecognitionProvider implements FaceRecognitionProvider {
  readonly name = "MockFaceRecognitionService (Demo Mode)";
  readonly isMock = true;

  async identifyFaces(
    _imageDataUrl: string,
    authorizedStudents: StudentItem[]
  ): Promise<FaceRecognitionResult> {
    // Simulate realistic processing delay
    await new Promise((resolve) => setTimeout(resolve, 900));

    const consentedStudents = authorizedStudents.filter((s) => s.guardianConsent);
    const samplePositions = [
      { x: 14, y: 22, width: 16, height: 22 },
      { x: 38, y: 20, width: 15, height: 21 },
      { x: 61, y: 24, width: 16, height: 22 },
      { x: 25, y: 52, width: 17, height: 23 },
      { x: 54, y: 50, width: 16, height: 23 },
    ];

    const matches: DetectedFaceMatch[] = [];
    const unidentifiedFaces: DetectedFaceMatch[] = [];

    const matchLimit = Math.min(consentedStudents.length, 4);
    for (let i = 0; i < matchLimit; i++) {
      const student = consentedStudents[i];
      const box = samplePositions[i % samplePositions.length];
      // Deterministic-feeling confidence for demo clarity
      const confidence = Number((84 + ((i * 7 + student.name.length) % 14)).toFixed(1));

      matches.push({
        faceId: `mock_face_${i + 1}`,
        boundingBox: box,
        matchedStudentId: student.id,
        matchedStudentName: student.name,
        matchedStudentCode: student.studentCode,
        confidence,
        isMockResult: true,
        verifiedByTeacher: false,
        suggestedStatus: "UNVERIFIED", // Never auto-mark PRESENT
      });
    }

    // Add 1 unidentified face to demonstrate manual teacher assignment workflow
    if (authorizedStudents.length > 0) {
      unidentifiedFaces.push({
        faceId: `mock_face_unidentified_1`,
        boundingBox: samplePositions[4],
        matchedStudentId: null,
        matchedStudentName: null,
        matchedStudentCode: null,
        confidence: 42.0,
        isMockResult: true,
        verifiedByTeacher: false,
        suggestedStatus: "UNVERIFIED",
      });
    }

    return {
      provider: this.name,
      isMock: true,
      disclaimer:
        "DEMO MODE: No external face-recognition API is configured. Results below are simulated demonstration matches. Teacher verification is mandatory before saving attendance.",
      processedAt: new Date().toISOString(),
      facesDetected: matches.length + unidentifiedFaces.length,
      matches,
      unidentifiedFaces,
    };
  }
}

/**
 * External AI Face Recognition Provider (replaceable adapter).
 * Activated when NEXT_PUBLIC_FACE_API_ENABLED / server proxy is configured.
 */
class ExternalFaceRecognitionProvider implements FaceRecognitionProvider {
  readonly name = "External Face Recognition API";
  readonly isMock = false;

  constructor(private readonly endpoint: string) {}

  async identifyFaces(
    imageDataUrl: string,
    authorizedStudents: StudentItem[]
  ): Promise<FaceRecognitionResult> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageDataUrl,
        candidateStudentIds: authorizedStudents
          .filter((s) => s.guardianConsent)
          .map((s) => s.id),
      }),
    });

    if (!response.ok) {
      throw new Error(`Face recognition service returned ${response.status}`);
    }

    return response.json();
  }
}

export function getFaceRecognitionProvider(): FaceRecognitionProvider {
  const customEndpoint = process.env.NEXT_PUBLIC_FACE_RECOGNITION_PROXY;
  if (customEndpoint) {
    return new ExternalFaceRecognitionProvider(customEndpoint);
  }
  return new MockFaceRecognitionProvider();
}
