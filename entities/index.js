import { User } from "./User.js";
import { Note } from "./Note.js";
import { NotePermission } from "./NotePermission.js";
import { NoteVersion } from "./NoteVersion.js";
import { Tag } from "./Tag.js";
import { NoteTag } from "./NoteTag.js";
import { NoteView } from "./NoteView.js";
import { NoteStar } from "./NoteStar.js";
import { NoteAttachment } from "./NoteAttachment.js";
import { NoteInvitation } from "./NoteInvitation.js";
import { NoteSlugRedirect } from "./NoteSlugRedirect.js";
import { AuditLog } from "./AuditLog.js";
import { NoteReport } from "./NoteReport.js";
import { SiteSetting } from "./SiteSetting.js";

export {
  User, Note, NotePermission, NoteVersion, Tag, NoteTag,
  NoteView, NoteStar, NoteAttachment, NoteInvitation, NoteSlugRedirect, AuditLog, NoteReport, SiteSetting,
};

export const entities = [
  User, Note, NotePermission, NoteVersion, Tag, NoteTag,
  NoteView, NoteStar, NoteAttachment, NoteInvitation, NoteSlugRedirect, AuditLog, NoteReport, SiteSetting,
];
