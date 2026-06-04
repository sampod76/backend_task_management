/**
 * 🔄 TODO:
 * If Zod enum changes, update this enum accordingly
 * @see Zod EventType enum (audit-log.schema.ts)
 */
export enum EventType {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  //
  BLOG_CREATED = 'BLOG_CREATED',
  BLOG_UPDATED = 'BLOG_UPDATED',
  BLOG_DELETED = 'BLOG_DELETED',
  //
  POST_CREATED = 'POST_CREATED',
  POST_UPDATED = 'POST_UPDATED',
  POST_DELETED = 'POST_DELETED',
  //
  COMMENT_CREATED = 'COMMENT_CREATED',
  COMMENT_UPDATED = 'COMMENT_UPDATED',
  COMMENT_DELETED = 'COMMENT_DELETED',
}
