export type EmergencyContact = {
  name: string;
  phone: string;
};

export type ExperienceLevel = 'first-timer' | 'day-hiker' | 'seasoned' | 'high-altitude';

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  imageUrl: string | null;
  level: ExperienceLevel;
  goals: string[];
  emergencyContact: EmergencyContact | null;
  alertsEnabled: boolean;
  createdAt: string;
};

export type OnboardingAnswers = {
  completed: boolean;
  fullName: string;
  level: ExperienceLevel | null;
  goals: string[];
  emergencyContact: EmergencyContact | null;
  alertsEnabled: boolean;
  completedAt: string | null;
};

export type GroupRole = 'leader' | 'member';
export type MemberStatus = 'active' | 'invited';

export type GroupMember = {
  id: string;
  name: string;
  email: string | null;
  role: GroupRole;
  status: MemberStatus;
  joinedAt: string;
};

export type TrekGroup = {
  outing?: { destination: string; meetingPoint: string; startTime: string; expectedPeople: number; walkingHours: number } | null;
  id: string;
  name: string;
  trekId: string;
  startDate: string;
  ownerId: string;
  members: GroupMember[];
  createdAt: string;
};

export type AlertKind = 'sos' | 'off-route' | 'weather' | 'check-in';

export type AlertEvent = {
  id: string;
  groupId: string;
  kind: AlertKind;
  message: string;
  latitude: number | null;
  longitude: number | null;
  acknowledgedBy: string[];
  createdAt: string;
  resolvedAt: string | null;
};
