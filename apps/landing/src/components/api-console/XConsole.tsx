"use client";

import { ApiDrawer, type EndpointDef } from "./ApiDrawer";

const X_ENDPOINTS: EndpointDef[] = [
  // ── User Lookup ───────────────────────────────────────────────────────

  {
    label: "Get User by Username",
    method: "GET",
    path: "/2/users/by/username/:username",
    description:
      "Look up an X (Twitter) user by their username. Returns profile info, follower count, bio, and verification status.",
    params: [
      {
        key: "username",
        placeholder: "Username without @ (e.g. elonmusk)",
        required: true,
      },
      {
        key: "user.fields",
        placeholder: "Fields to include",
        defaultValue:
          "created_at,description,public_metrics,profile_image_url,verified",
      },
      {
        key: "expansions",
        placeholder: "e.g. pinned_tweet_id",
      },
    ],
    headers: [
      {
        key: "Authorization",
        placeholder: "Bearer YOUR_BEARER_TOKEN",
        required: true,
      },
    ],
  },

  // ── User Posts ─────────────────────────────────────────────────────────

  {
    label: "Get User Posts",
    method: "GET",
    path: "/2/users/:id/tweets",
    description:
      "Get recent posts from an X user by their numeric user ID. Requires looking up the user first to obtain the ID.",
    params: [
      {
        key: "id",
        placeholder: "Numeric user ID (e.g. 44196397)",
        required: true,
      },
      {
        key: "max_results",
        placeholder: "5–100 (default: 10)",
        defaultValue: "10",
      },
      {
        key: "tweet.fields",
        placeholder: "Fields to include",
        defaultValue: "created_at,public_metrics,text,author_id",
      },
      {
        key: "exclude",
        placeholder: "replies,retweets",
      },
      {
        key: "pagination_token",
        placeholder: "Pagination cursor from previous response",
      },
    ],
    headers: [
      {
        key: "Authorization",
        placeholder: "Bearer YOUR_BEARER_TOKEN",
        required: true,
      },
    ],
  },

  // ── Search ─────────────────────────────────────────────────────────────

  {
    label: "Search Posts",
    method: "GET",
    path: "/2/tweets/search/recent",
    description:
      "Search recent X posts (last 7 days). Supports operators like from:user, #hashtag, @mention, lang:en, -is:retweet, min_faves:100.",
    params: [
      {
        key: "query",
        placeholder: "Search query (e.g. from:elonmusk -is:retweet)",
        required: true,
      },
      {
        key: "max_results",
        placeholder: "10–100 (default: 10)",
        defaultValue: "10",
      },
      {
        key: "sort_order",
        placeholder: "recency or relevancy",
        defaultValue: "recency",
      },
      {
        key: "tweet.fields",
        placeholder: "Fields to include",
        defaultValue: "created_at,public_metrics,author_id",
      },
      {
        key: "expansions",
        placeholder: "e.g. author_id,attachments.media_keys",
      },
      {
        key: "next_token",
        placeholder: "Pagination token from previous response",
      },
    ],
    headers: [
      {
        key: "Authorization",
        placeholder: "Bearer YOUR_BEARER_TOKEN",
        required: true,
      },
    ],
  },

  // ── Trends ─────────────────────────────────────────────────────────────

  {
    label: "Get Trends",
    method: "GET",
    path: "/2/trends/by/woeid/:woeid",
    description:
      "Get current trending topics on X by location. Use WOEID 1 for worldwide trends. Returns trend names and post counts.",
    params: [
      {
        key: "woeid",
        placeholder: "Where On Earth ID (1 = worldwide)",
        required: true,
        defaultValue: "1",
      },
      {
        key: "max_trends",
        placeholder: "1–50 (default: 20)",
        defaultValue: "20",
      },
      {
        key: "trend.fields",
        placeholder: "e.g. trend_name,tweet_count",
        defaultValue: "trend_name,tweet_count",
      },
    ],
    headers: [
      {
        key: "Authorization",
        placeholder: "Bearer YOUR_BEARER_TOKEN",
        required: true,
      },
    ],
  },

  // ── Single Post ────────────────────────────────────────────────────────

  {
    label: "Get Post by ID",
    method: "GET",
    path: "/2/tweets/:id",
    description:
      "Fetch a single X post by its numeric ID. Returns full post content, engagement metrics, and author info.",
    params: [
      {
        key: "id",
        placeholder: "Post/Tweet ID (numeric)",
        required: true,
      },
      {
        key: "tweet.fields",
        placeholder: "Fields to include",
        defaultValue:
          "created_at,public_metrics,text,author_id,conversation_id,entities",
      },
      {
        key: "expansions",
        placeholder: "e.g. author_id,attachments.media_keys",
        defaultValue: "author_id",
      },
      {
        key: "user.fields",
        placeholder: "e.g. username,profile_image_url",
        defaultValue: "username,profile_image_url",
      },
    ],
    headers: [
      {
        key: "Authorization",
        placeholder: "Bearer YOUR_BEARER_TOKEN",
        required: true,
      },
    ],
  },
];

export function XConsole() {
  return (
    <ApiDrawer
      defaultBaseUrl="https://api.x.com"
      endpoints={X_ENDPOINTS}
    />
  );
}
