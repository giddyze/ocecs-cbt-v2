import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.STUDENT_SESSION_SECRET || "dev-only-insecure-secret"
);
const COOKIE_NAME = "cbt_student_session";
const SESSION_HOURS = 6;

export type StudentTokenPayload = {
  studentId: string;
  username: string;
  fullName: string;
  classId: string;
  sessionToken: string; // must match the current row in student_sessions
};

export async function signStudentToken(payload: StudentTokenPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(SECRET);
}

export async function verifyStudentToken(token: string): Promise<StudentTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as StudentTokenPayload;
  } catch {
    return null;
  }
}

export const STUDENT_COOKIE_NAME = COOKIE_NAME;
export const STUDENT_SESSION_MAX_AGE_SECONDS = SESSION_HOURS * 60 * 60;
