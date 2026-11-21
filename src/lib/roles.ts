import { ApiError } from '@/lib/api';
import { findDemoAuthUserById } from '@/lib/demo/auth';

export async function currentPatient(userId: string) {
  const user = findDemoAuthUserById(userId);
  if (!user?.patient) throw new ApiError('NOT_FOUND', 404);
  return user.patient;
}

export async function currentDoctor(userId: string) {
  const user = findDemoAuthUserById(userId);
  if (!user?.doctor) throw new ApiError('NOT_FOUND', 404);
  return user.doctor;
}
