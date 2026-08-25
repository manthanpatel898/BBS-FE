export type FeedbackInvitationStatus = 'PENDING' | 'SUBMITTED' | 'EXPIRED' | 'REVOKED';
export type FeedbackModerationStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
export type FeedbackImageDisplayMode = 'CROP' | 'FULL';

export type FeedbackPrefill = {
  fullName: string;
  designation: string;
  company: string;
};

export type PublicInvitation =
  | { status: 'READY'; prefill: FeedbackPrefill }
  | { status: 'EXPIRED' | 'USED' | 'INVALID' };

export type FeedbackImage = {
  key: string;
  url: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  displayMode: FeedbackImageDisplayMode;
};

export type FeedbackVersion = FeedbackPrefill & {
  rating: number;
  message: string;
  image: FeedbackImage;
};

export type CustomerFeedback = {
  _id: string;
  invitationId: string;
  moderationStatus: FeedbackModerationStatus;
  isPublished: boolean;
  displayOrder: number;
  original: FeedbackVersion;
  publicVersion: FeedbackVersion;
  submittedAt: string;
  rejectionReason: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type PublishedFeedback = {
  id: string;
  fullName: string;
  designation: string;
  company: string;
  rating: number;
  message: string;
  imageUrl: string;
  imageDisplayMode: FeedbackImageDisplayMode;
  publishedAt: string;
};

export type FeedbackInvitation = {
  id: string;
  status: FeedbackInvitationStatus;
  prefill: FeedbackPrefill;
  expiresAt: string;
  submittedAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  replacementInvitationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackPagination<T> = {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type FeedbackCounts = {
  pendingLinks: number;
  awaitingReview: number;
  published: number;
};

export type FeedbackListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  moderationStatus?: FeedbackModerationStatus;
  invitationStatus?: FeedbackInvitationStatus;
};

export type SubmitFeedbackInput = FeedbackPrefill & {
  rating: number;
  message: string;
  consentAccepted: true;
  displayMode: FeedbackImageDisplayMode;
  image: File;
};

