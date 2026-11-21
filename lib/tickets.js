// Support ticket constants, shared by the support pages, the admin panel and the validators.
export const TICKET_CATEGORIES = {
  account: "Account & sign-in",
  bug: "Bug or error",
  feature: "Feature request",
  abuse: "Abuse or safety",
  other: "Something else",
};
export const TICKET_STATUSES = ["open", "answered", "closed"];
export const TICKET_PRIORITIES = ["low", "normal", "high"];
export const TICKET_SUBJECT_MAX = 150;
export const TICKET_MESSAGE_MAX = 5000;
/** How many unclosed tickets one user may have at a time. */
export const TICKET_MAX_OPEN = 5;
