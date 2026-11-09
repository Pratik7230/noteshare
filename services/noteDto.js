/** Shape notes for API output. Never includes passwordHash or editKeyHash. */
export function noteDto(note, access, extra = {}) {
  return {
    id: note.id,
    title: note.title,
    slug: note.slug,
    content: note.content,
    contentType: note.contentType,
    privacy: note.privacy,
    sharePermission: note.sharePermission,
    hasPassword: !!note.passwordHash,
    ownerId: note.ownerId,
    isAnonymous: !note.ownerId,
    expiresAt: note.expiresAt,
    accessExpiresAt: note.accessExpiresAt,
    maxViews: note.maxViews,
    isArchived: note.isArchived,
    isDeleted: note.isDeleted,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    access: { isManager: access.isManager, canEdit: access.canEdit, isOwner: access.isOwner },
    ...extra,
  };
}
