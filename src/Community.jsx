import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./Community.css";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "harassment", label: "Harassment" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

export default function Community({ user }) {
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [storyUploading, setStoryUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [storyCaption, setStoryCaption] = useState("");
  const [selectedStory, setSelectedStory] = useState(null);
  const [activeStory, setActiveStory] = useState(null);
  const [error, setError] = useState("");
  const [commentInputs, setCommentInputs] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [submittingComment, setSubmittingComment] = useState(null);
  const [storyViews, setStoryViews] = useState([]);

  // Community 2.0 state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [polls, setPolls] = useState([]);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [votingPollId, setVotingPollId] = useState(null);
  const [reportingPost, setReportingPost] = useState(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const getMemberName = (profile) =>
    profile?.display_name || profile?.username || "Realm Member";

  const getUsername = (profile) =>
    profile?.username ? `@${profile.username}` : "@realm-member";

  const getSignedImage = async (path) => {
    if (!path) return "";
    const { data, error: imageError } = await supabase.storage
      .from("shadow-posts")
      .createSignedUrl(path, 3600);
    if (imageError) {
      console.error("Image URL error:", imageError);
      return "";
    }
    return data?.signedUrl || "";
  };

  const notifyMember = async ({ recipientId, type, postId = null, message }) => {
    if (!user?.id || !recipientId || recipientId === user.id) return;
    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id: recipientId,
      actor_id: user.id,
      type,
      post_id: postId,
      message,
    });
    // Notifications are a convenience feature; don't fail the main action if one
    // cannot be written (for example, because a policy has changed).
    if (notificationError) console.warn("Notification could not be created:", notificationError.message);
  };

  const loadPosts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");

    try {
      const [
        postResult,
        storyResult,
        savedResult,
        notificationResult,
        pollResult,
      ] = await Promise.all([
        supabase.from("posts").select("*").order("created_at", { ascending: false }),
        supabase.from("stories").select("*").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
        supabase.from("saved_posts").select("post_id").eq("user_id", user.id),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("polls").select("*").order("created_at", { ascending: false }).limit(30),
      ]);

      if (postResult.error) throw postResult.error;
      if (storyResult.error) throw storyResult.error;
      if (savedResult.error) throw savedResult.error;
      if (notificationResult.error) throw notificationResult.error;
      if (pollResult.error) throw pollResult.error;

      const postData = postResult.data || [];
      const storyData = storyResult.data || [];
      const savedIds = (savedResult.data || []).map((item) => item.post_id);
      const notificationData = notificationResult.data || [];
      const pollData = pollResult.data || [];

      const postIds = postData.map((post) => post.id);
      const storyIds = storyData.map((story) => story.id);
      const pollIds = pollData.map((poll) => poll.id);

      const [
        profilesResult,
        likesResult,
        commentsResult,
        viewsResult,
        postHashtagsResult,
        hashtagsResult,
        pollOptionsResult,
        pollVotesResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, avatar_url"),
        postIds.length
          ? supabase.from("likes").select("id, post_id, user_id").in("post_id", postIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase.from("comments").select("id, post_id, user_id, content, created_at").in("post_id", postIds).order("created_at", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        storyIds.length
          ? supabase.from("story_views").select("id, story_id, viewer_id").in("story_id", storyIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase.from("post_hashtags").select("post_id, hashtag_id").in("post_id", postIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from("hashtags").select("id, name"),
        pollIds.length
          ? supabase.from("poll_options").select("*").in("poll_id", pollIds).order("id", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        pollIds.length
          ? supabase.from("poll_votes").select("id, poll_id, option_id, user_id").in("poll_id", pollIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      for (const result of [profilesResult, likesResult, commentsResult, viewsResult, postHashtagsResult, hashtagsResult, pollOptionsResult, pollVotesResult]) {
        if (result.error) throw result.error;
      }

      const profileMap = {};
      await Promise.all((profilesResult.data || []).map(async (profile) => {
        profileMap[profile.id] = {
          ...profile,
          avatarUrl: await getSignedImage(profile.avatar_url),
        };
      }));

      const comments = commentsResult.data || [];
      const enrichedPosts = await Promise.all(postData.map(async (post) => {
        const postLikes = (likesResult.data || []).filter((like) => like.post_id === post.id);
        const postComments = comments
          .filter((comment) => comment.post_id === post.id)
          .map((comment) => ({ ...comment, profile: profileMap[comment.user_id] }));

        const hashtagIds = (postHashtagsResult.data || [])
          .filter((item) => item.post_id === post.id)
          .map((item) => item.hashtag_id);
        const postTags = (hashtagsResult.data || [])
          .filter((tag) => hashtagIds.includes(tag.id))
          .map((tag) => tag.name);

        return {
          ...post,
          imageUrl: await getSignedImage(post.image_path),
          profile: profileMap[post.user_id],
          likes: postLikes,
          comments: postComments,
          hashtags: postTags,
          isSaved: savedIds.includes(post.id),
        };
      }));

      const enrichedStories = await Promise.all(storyData.map(async (story) => ({
        ...story,
        imageUrl: await getSignedImage(story.image_path),
        profile: profileMap[story.user_id],
        views: (viewsResult.data || []).filter((view) => view.story_id === story.id),
      })));

      const enrichedPolls = pollData.map((poll) => {
        const options = (pollOptionsResult.data || [])
          .filter((option) => option.poll_id === poll.id)
          .map((option) => ({
            ...option,
            votes: (pollVotesResult.data || []).filter((vote) => vote.option_id === option.id),
          }));
        const myVote = (pollVotesResult.data || []).find(
          (vote) => vote.poll_id === poll.id && vote.user_id === user.id
        );
        return { ...poll, profile: profileMap[poll.user_id], options, myVote };
      });

      const enrichedNotifications = notificationData.map((notification) => ({
        ...notification,
        actor: profileMap[notification.actor_id],
      }));

      setPosts(enrichedPosts);
      setStories(enrichedStories);
      setStoryViews(viewsResult.data || []);
      setSavedPostIds(savedIds);
      setNotifications(enrichedNotifications);
      setPolls(enrichedPolls);
    } catch (err) {
      console.error("Community loading error:", err);
      setError(err.message || "Could not load community.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // CREATE POST + save hashtags in the normalized hashtag tables.
  async function saveHashtags(postId, text) {
    const names = [...new Set((text.match(/#[a-zA-Z0-9_]+/g) || []).map((tag) => tag.slice(1).toLowerCase()))];
    if (!names.length) return;

    const tagIds = [];
    for (const name of names) {
      const { data: existing, error: findError } = await supabase
        .from("hashtags").select("id").eq("name", name).maybeSingle();
      if (findError) throw findError;
      if (existing?.id) {
        tagIds.push(existing.id);
      } else {
        const { data: created, error: createError } = await supabase
          .from("hashtags").insert({ name }).select("id").single();
        if (createError) {
          // Another member may have created this hashtag at the same moment.
          const { data: raced, error: racedError } = await supabase
            .from("hashtags").select("id").eq("name", name).maybeSingle();
          if (racedError || !raced?.id) throw createError;
          tagIds.push(raced.id);
        } else if (created?.id) {
          tagIds.push(created.id);
        }
      }
    }

    if (tagIds.length) {
      const { error: linkError } = await supabase.from("post_hashtags").insert(
        tagIds.map((hashtagId) => ({ post_id: postId, hashtag_id: hashtagId }))
      );
      if (linkError) throw linkError;
    }
  }

  async function handleCreatePost(event) {
    event.preventDefault();
    if (!selectedImage || !user?.id) {
      setError("Please select a photo first.");
      return;
    }
    if (!IMAGE_TYPES.includes(selectedImage.type)) {
      setError("Only JPEG, PNG and WEBP images are allowed.");
      return;
    }
    if (selectedImage.size > MAX_IMAGE_SIZE) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    setUploading(true);
    setError("");
    let imagePath = null;
    let createdPostId = null;

    try {
      const extension = selectedImage.name.split(".").pop().toLowerCase();
      imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("shadow-posts").upload(imagePath, selectedImage, {
        contentType: selectedImage.type,
      });
      if (uploadError) throw uploadError;

      const { data: insertedPost, error: insertError } = await supabase
        .from("posts")
        .insert({ user_id: user.id, image_path: imagePath, caption: caption.trim() })
        .select("id")
        .single();
      if (insertError) throw insertError;
      createdPostId = insertedPost.id;

      try {
        await saveHashtags(createdPostId, caption);
      } catch (tagError) {
        console.warn("Post was published, but hashtags could not be saved:", tagError);
        setError("Post published, but one or more hashtags could not be linked.");
      }

      setCaption("");
      setSelectedImage(null);
      const input = document.getElementById("shadow-post-image");
      if (input) input.value = "";
      await loadPosts();
    } catch (err) {
      if (imagePath && !createdPostId) {
        await supabase.storage.from("shadow-posts").remove([imagePath]);
      }
      setError(err.message || "Could not create your post.");
    } finally {
      setUploading(false);
    }
  }

  // STORIES
  async function handleCreateStory(event) {
    event.preventDefault();
    if (!selectedStory || !user?.id) {
      setError("Please select a story photo.");
      return;
    }
    if (!IMAGE_TYPES.includes(selectedStory.type)) {
      setError("Only JPEG, PNG and WEBP images are allowed.");
      return;
    }
    if (selectedStory.size > MAX_IMAGE_SIZE) {
      setError("Story image must be smaller than 5 MB.");
      return;
    }

    setStoryUploading(true);
    setError("");
    let imagePath = null;
    try {
      const extension = selectedStory.name.split(".").pop().toLowerCase();
      imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("shadow-posts").upload(imagePath, selectedStory, {
        contentType: selectedStory.type,
      });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("stories").insert({
        user_id: user.id,
        image_path: imagePath,
        caption: storyCaption.trim(),
      });
      if (insertError) throw insertError;

      setSelectedStory(null);
      setStoryCaption("");
      const input = document.getElementById("shadow-story-image");
      if (input) input.value = "";
      await loadPosts();
    } catch (err) {
      if (imagePath) await supabase.storage.from("shadow-posts").remove([imagePath]);
      setError(err.message || "Could not publish story.");
    } finally {
      setStoryUploading(false);
    }
  }

  async function openStory(story) {
    setActiveStory(story);
    if (story.user_id === user.id) return;
    const alreadyViewed = (story.views || []).some((view) => view.viewer_id === user.id);
    if (alreadyViewed) return;

    const { error: viewError } = await supabase.from("story_views").insert({
      story_id: story.id,
      viewer_id: user.id,
    });
    if (viewError) {
      console.error("Story view error:", viewError);
      return;
    }
    setStories((previous) => previous.map((item) => item.id === story.id
      ? { ...item, views: [...(item.views || []), { viewer_id: user.id }] }
      : item
    ));
    setStoryViews((previous) => [...previous, { story_id: story.id, viewer_id: user.id }]);
  }

  async function handleDeleteStory(story) {
    if (story.user_id !== user.id || !window.confirm("Delete this story?")) return;
    setError("");
    try {
      const { error: deleteError } = await supabase.from("stories").delete().eq("id", story.id).eq("user_id", user.id);
      if (deleteError) throw deleteError;
      await supabase.storage.from("shadow-posts").remove([story.image_path]);
      setActiveStory(null);
      await loadPosts();
    } catch (err) {
      setError(err.message || "Could not delete story.");
    }
  }

  // LIKES
  async function handleLike(post) {
    const existingLike = post.likes.find((like) => like.user_id === user.id);
    const { error: likeError } = existingLike
      ? await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id)
      : await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
    if (likeError) {
      setError(likeError.message);
      return;
    }
    if (!existingLike) {
      await notifyMember({
        recipientId: post.user_id,
        type: "like",
        postId: post.id,
        message: `${getMemberName(post.profile)} liked your post.`,
      });
    }
    await loadPosts();
  }

  // COMMENTS
  async function handleComment(post) {
    const content = (commentInputs[post.id] || "").trim();
    if (!content) return;
    setSubmittingComment(post.id);
    setError("");
    try {
      const { error: commentError } = await supabase.from("comments").insert({
        post_id: post.id,
        user_id: user.id,
        content,
      });
      if (commentError) throw commentError;
      await notifyMember({
        recipientId: post.user_id,
        type: "comment",
        postId: post.id,
        message: `${getMemberName(post.profile)} commented on your post.`,
      });
      setCommentInputs((previous) => ({ ...previous, [post.id]: "" }));
      await loadPosts();
    } catch (err) {
      setError(err.message || "Could not add comment.");
    } finally {
      setSubmittingComment(null);
    }
  }

  async function handleDeletePost(post) {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    setError("");
    try {
      const { error: deleteError } = await supabase.from("posts").delete().eq("id", post.id).eq("user_id", user.id);
      if (deleteError) throw deleteError;
      await supabase.storage.from("shadow-posts").remove([post.image_path]);
      await loadPosts();
    } catch (err) {
      setError(err.message || "Could not delete post.");
    }
  }

  // SAVED POSTS
  async function toggleSavedPost(post) {
    setError("");
    const alreadySaved = savedPostIds.includes(post.id);
    if (alreadySaved) {
      const { error: deleteError } = await supabase.from("saved_posts").delete().eq("post_id", post.id).eq("user_id", user.id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      setSavedPostIds((previous) => previous.filter((id) => id !== post.id));
    } else {
      const { error: insertError } = await supabase.from("saved_posts").insert({ post_id: post.id, user_id: user.id });
      if (insertError) {
        setError(insertError.message);
        return;
      }
      setSavedPostIds((previous) => [...previous, post.id]);
    }
    setPosts((previous) => previous.map((item) => item.id === post.id ? { ...item, isSaved: !alreadySaved } : item));
  }

  // POLLS
  async function handleCreatePoll(event) {
    event.preventDefault();
    const question = pollQuestion.trim();
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (!question) {
      setError("Write a question for your poll.");
      return;
    }
    if (options.length < 2 || options.length > 4) {
      setError("A poll needs 2 to 4 non-empty options.");
      return;
    }

    setCreatingPoll(true);
    setError("");
    try {
      const { data: poll, error: pollError } = await supabase.from("polls")
        .insert({ user_id: user.id, question })
        .select("*")
        .single();
      if (pollError) throw pollError;

      const { error: optionsError } = await supabase.from("poll_options").insert(
        options.map((option_text) => ({ poll_id: poll.id, option_text }))
      );
      if (optionsError) {
        await supabase.from("polls").delete().eq("id", poll.id).eq("user_id", user.id);
        throw optionsError;
      }

      setPollQuestion("");
      setPollOptions(["", ""]);
      await loadPosts();
    } catch (err) {
      setError(err.message || "Could not create poll.");
    } finally {
      setCreatingPoll(false);
    }
  }

  async function handleVote(poll, option) {
    if (poll.myVote || votingPollId) return;
    setVotingPollId(poll.id);
    setError("");
    try {
      const { error: voteError } = await supabase.from("poll_votes").insert({
        poll_id: poll.id,
        option_id: option.id,
        user_id: user.id,
      });
      if (voteError) throw voteError;
      if (poll.user_id !== user.id) {
        await notifyMember({
          recipientId: poll.user_id,
          type: "poll_vote",
          message: `${getMemberName(poll.profile)} voted in your poll: "${poll.question}"`,
        });
      }
      await loadPosts();
    } catch (err) {
      setError(err.message || "Could not submit vote. You may have already voted.");
    } finally {
      setVotingPollId(null);
    }
  }

  async function handleDeletePoll(poll) {
    if (poll.user_id !== user.id || !window.confirm("Delete this poll?")) return;
    setError("");
    try {
      // Remove dependent rows first so the poll can be deleted cleanly.
      const optionIds = (poll.options || []).map((option) => option.id);
      if (optionIds.length) {
        const { error: voteDeleteError } = await supabase.from("poll_votes").delete().eq("poll_id", poll.id);
        if (voteDeleteError) throw voteDeleteError;
        const { error: optionDeleteError } = await supabase.from("poll_options").delete().eq("poll_id", poll.id);
        if (optionDeleteError) throw optionDeleteError;
      }
      const { error: pollDeleteError } = await supabase.from("polls").delete().eq("id", poll.id).eq("user_id", user.id);
      if (pollDeleteError) throw pollDeleteError;
      await loadPosts();
    } catch (err) {
      setError(err.message || "Could not delete poll.");
    }
  }

  // NOTIFICATIONS
  async function markNotificationRead(notification) {
    if (notification.is_read) return;
    const { error: updateError } = await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id).eq("user_id", user.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setNotifications((previous) => previous.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
  }

  async function markAllNotificationsRead() {
    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (!unreadIds.length) return;
    const { error: updateError } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).in("id", unreadIds);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setNotifications((previous) => previous.map((item) => ({ ...item, is_read: true })));
  }

  // REPORTS
  async function handleReportPost(event) {
    event.preventDefault();
    if (!reportingPost || reportingPost.user_id === user.id) return;
    setSubmittingReport(true);
    setError("");
    try {
      const { error: reportError } = await supabase.from("post_reports").insert({
        post_id: reportingPost.id,
        reporter_id: user.id,
        reason: reportReason,
        details: reportDetails.trim() || null,
      });
      if (reportError) {
        if (reportError.code === "23505") throw new Error("You have already reported this post.");
        throw reportError;
      }
      setReportingPost(null);
      setReportReason("spam");
      setReportDetails("");
      setError("Report submitted. Thanks for helping keep the community safe.");
    } catch (err) {
      setError(err.message || "Could not submit report.");
    } finally {
      setSubmittingReport(false);
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getRemainingTime(date) {
    const difference = new Date(date).getTime() - Date.now();
    if (difference <= 0) return "Expired";
    const hours = Math.floor(difference / 3600000);
    const minutes = Math.floor((difference % 3600000) / 60000);
    return `${hours}h ${minutes}m left`;
  }

  const groupedStories = useMemo(() => {
    const groups = [];
    stories.forEach((story) => {
      let group = groups.find((item) => item.user_id === story.user_id);
      if (!group) {
        group = { user_id: story.user_id, profile: story.profile, stories: [] };
        groups.push(group);
      }
      group.stories.push(story);
    });
    return groups;
  }, [stories]);

  const myStoryGroup = groupedStories.find((group) => group.user_id === user?.id);
  const otherStoryGroups = groupedStories.filter((group) => group.user_id !== user?.id);
  const activeStoryIndex = activeStory ? stories.findIndex((story) => story.id === activeStory.id) : -1;
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (showSavedOnly && !savedPostIds.includes(post.id)) return false;
      if (!query) return true;
      const searchable = [
        post.caption || "",
        getMemberName(post.profile),
        post.profile?.username || "",
        ...(post.hashtags || []).map((tag) => `#${tag}`),
      ].join(" ").toLowerCase();
      return searchable.includes(query.replace(/^#/, "")) || searchable.includes(query);
    });
  }, [posts, searchQuery, showSavedOnly, savedPostIds]);

  function moveStory(direction) {
    const nextIndex = activeStoryIndex + direction;
    if (nextIndex < 0 || nextIndex >= stories.length) {
      setActiveStory(null);
      return;
    }
    openStory(stories[nextIndex]);
  }

  return (
    <div className="community-page">
      <div className="community-header">
        <div>
          <span className="community-eyebrow">◈ SHADOW REALM / SOCIAL</span>
          <h1>Community <span>Feed.</span></h1>
          <p>Your moments. Your people. Your realm.</p>
        </div>
        <div className="community-header-actions">
          <button type="button" className="community-notification-toggle" onClick={() => setShowNotifications((value) => !value)}>
            🔔 Notifications {unreadCount > 0 && <span>{unreadCount}</span>}
          </button>
          <button type="button" className="community-refresh" onClick={loadPosts} disabled={loading}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && <div className="community-error" role="status">{error}</div>}

      {showNotifications && (
        <section className="community-notifications-panel">
          <div className="community-section-title-row">
            <div>
              <span className="community-eyebrow">REALM / ACTIVITY</span>
              <h2>Notifications</h2>
            </div>
            <button type="button" onClick={markAllNotificationsRead} disabled={!unreadCount}>Mark all read</button>
          </div>
          {notifications.length === 0 ? (
            <p className="community-muted">Nothing here yet. Likes, comments and poll votes will appear here.</p>
          ) : notifications.map((notification) => (
            <button
              type="button"
              key={notification.id}
              className={`community-notification-item ${notification.is_read ? "" : "is-unread"}`}
              onClick={() => markNotificationRead(notification)}
            >
              <span className="community-notification-avatar">
                {(getMemberName(notification.actor).charAt(0) || "R").toUpperCase()}
              </span>
              <span>
                <strong>{getMemberName(notification.actor)}</strong>
                <small>{notification.message || `New ${notification.type} activity`}</small>
                <small>{formatDate(notification.created_at)}</small>
              </span>
              {!notification.is_read && <i aria-label="Unread" />}
            </button>
          ))}
        </section>
      )}

      {/* STORIES */}
      <section className="community-stories-section">
        <div className="community-stories-heading">
          <div>
            <span className="community-eyebrow">REALM / 24 HOURS</span>
            <h2>Stories</h2>
          </div>
          <span>DISAPPEAR IN 24H</span>
        </div>

        <div className="community-stories-bar">
          <label className="community-story-item community-add-story" htmlFor="shadow-story-image">
            <div className="community-story-ring"><div className="community-story-avatar">+</div></div>
            <span>Your Story</span>
          </label>

          {myStoryGroup && (
            <button type="button" className="community-story-item" onClick={() => openStory(myStoryGroup.stories[0])}>
              <div className="community-story-ring community-own-story">
                <div className="community-story-avatar">
                  {myStoryGroup.profile?.avatarUrl
                    ? <img src={myStoryGroup.profile.avatarUrl} alt="Your profile" />
                    : getMemberName(myStoryGroup.profile).charAt(0).toUpperCase()}
                </div>
              </div>
              <span>Your Story</span>
            </button>
          )}

          {otherStoryGroups.map((group) => (
            <button type="button" className="community-story-item" key={group.user_id} onClick={() => openStory(group.stories[0])}>
              <div className="community-story-ring">
                <div className="community-story-avatar">
                  {group.profile?.avatarUrl
                    ? <img src={group.profile.avatarUrl} alt="Member" />
                    : getMemberName(group.profile).charAt(0).toUpperCase()}
                </div>
              </div>
              <span>{getMemberName(group.profile)}</span>
            </button>
          ))}
        </div>

        <form className="community-story-create" onSubmit={handleCreateStory}>
          <input
            id="shadow-story-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => setSelectedStory(event.target.files?.[0] || null)}
          />
          {selectedStory && (
            <>
              <span>{selectedStory.name}</span>
              <input
                type="text"
                placeholder="Add a story caption..."
                maxLength={200}
                value={storyCaption}
                onChange={(event) => setStoryCaption(event.target.value)}
              />
              <button type="submit" disabled={storyUploading}>{storyUploading ? "Uploading..." : "Share Story ↗"}</button>
              <button type="button" onClick={() => {
                setSelectedStory(null);
                setStoryCaption("");
                const input = document.getElementById("shadow-story-image");
                if (input) input.value = "";
              }}>Cancel</button>
            </>
          )}
        </form>
      </section>

      {/* CREATE POST */}
      <form className="community-create-card" onSubmit={handleCreatePost}>
        <div className="community-create-heading">
          <span>✳</span>
          <div><strong>Create a moment</strong><small>Share something with your realm.</small></div>
        </div>
        <textarea
          placeholder={"What's happening in your world? Add #hashtags to help people find your post."}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          maxLength={1000}
        />
        <div className="community-upload-row">
          <label htmlFor="shadow-post-image" className="community-upload-button">＋ Add Photo</label>
          <input
            id="shadow-post-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => setSelectedImage(event.target.files?.[0] || null)}
          />
          <span className="community-file-name">{selectedImage ? selectedImage.name : "JPEG, PNG or WEBP · Max 5 MB"}</span>
          <button type="submit" className="community-post-button" disabled={uploading || !selectedImage}>
            {uploading ? "Publishing..." : "Publish ↗"}
          </button>
        </div>
        {selectedImage && (
          <div className="community-image-preview">
            <img src={URL.createObjectURL(selectedImage)} alt="Selected preview" />
            <button type="button" onClick={() => {
              setSelectedImage(null);
              const input = document.getElementById("shadow-post-image");
              if (input) input.value = "";
            }}>Remove</button>
          </div>
        )}
      </form>

      {/* POLLS */}
      <section className="community-polls-section">
        <div className="community-section-title-row">
          <div>
            <span className="community-eyebrow">REALM / COMMUNITY VOICE</span>
            <h2>Quick Polls</h2>
          </div>
        </div>

        <form className="community-poll-create" onSubmit={handleCreatePoll}>
          <input
            type="text"
            value={pollQuestion}
            maxLength={180}
            placeholder="Ask your community a question..."
            onChange={(event) => setPollQuestion(event.target.value)}
          />
          {pollOptions.map((option, index) => (
            <div className="community-poll-option-input" key={index}>
              <input
                type="text"
                value={option}
                maxLength={100}
                placeholder={`Option ${index + 1}`}
                onChange={(event) => setPollOptions((previous) => previous.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
              />
              {pollOptions.length > 2 && (
                <button type="button" onClick={() => setPollOptions((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove option ${index + 1}`}>×</button>
              )}
            </div>
          ))}
          {pollOptions.length < 4 && (
            <button type="button" className="community-add-poll-option" onClick={() => setPollOptions((previous) => [...previous, ""])}>＋ Add option</button>
          )}
          <button type="submit" className="community-post-button" disabled={creatingPoll}>{creatingPoll ? "Creating..." : "Create Poll ↗"}</button>
        </form>

        {polls.length === 0 ? (
          <p className="community-muted">No polls yet. Create the first one!</p>
        ) : (
          <div className="community-polls-list">
            {polls.map((poll) => {
              const totalVotes = poll.options.reduce((total, option) => total + option.votes.length, 0);
              return (
                <article className="community-poll-card" key={poll.id}>
                  <div className="community-poll-heading">
                    <div>
                      <strong>{poll.question}</strong>
                      <small>{getMemberName(poll.profile)} · {formatDate(poll.created_at)}</small>
                    </div>
                    {poll.user_id === user.id && <button type="button" className="community-delete" onClick={() => handleDeletePoll(poll)}>Delete</button>}
                  </div>
                  <div className="community-poll-options">
                    {poll.options.map((option) => {
                      const count = option.votes.length;
                      const percentage = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                      const selected = poll.myVote?.option_id === option.id;
                      return (
                        <button
                          type="button"
                          key={option.id}
                          className={`community-poll-option ${selected ? "is-selected" : ""}`}
                          onClick={() => handleVote(poll, option)}
                          disabled={Boolean(poll.myVote) || votingPollId === poll.id}
                        >
                          <span className="community-poll-option-label">{option.option_text}</span>
                          {(poll.myVote || totalVotes > 0) && (
                            <span className="community-poll-result">
                              <span style={{ width: `${percentage}%` }} />
                              <strong>{percentage}% · {count}</strong>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <small className="community-poll-total">{totalVotes} vote{totalVotes === 1 ? "" : "s"}{poll.myVote ? " · Your vote is recorded" : " · Choose one option"}</small>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* SEARCH + SAVED FILTER */}
      <div className="community-feed-toolbar">
        <div className="community-feed-heading">
          <h2>{showSavedOnly ? "Saved Moments" : "Latest Moments"}</h2>
          <span>{filteredPosts.length} POSTS</span>
        </div>
        <div className="community-search-row">
          <input
            type="search"
            value={searchQuery}
            placeholder="Search members, captions or #hashtags..."
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search community posts"
          />
          <button type="button" className={showSavedOnly ? "is-active" : ""} onClick={() => setShowSavedOnly((value) => !value)}>
            {showSavedOnly ? "★ Showing Saved" : "☆ Saved Posts"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="community-empty"><span>◈</span><p>Loading the realm...</p></div>
      ) : filteredPosts.length === 0 ? (
        <div className="community-empty">
          <span>✳</span>
          <h3>{showSavedOnly ? "No saved moments yet." : searchQuery ? "No matching moments." : "The realm is quiet."}</h3>
          <p>{showSavedOnly ? "Save a post to find it here later." : searchQuery ? "Try another search or hashtag." : "Be the first to share a moment!"}</p>
        </div>
      ) : (
        <div className="community-feed">
          {filteredPosts.map((post) => {
            const liked = post.likes.some((like) => like.user_id === user.id);
            const alreadyReportedByUser = false; // Reports are private; the database prevents duplicate reports.
            return (
              <article className="community-post-card" key={post.id}>
                <div className="community-post-header">
                  <div className="community-member-avatar">
                    {post.profile?.avatarUrl
                      ? <img src={post.profile.avatarUrl} alt="Member" />
                      : getMemberName(post.profile).charAt(0).toUpperCase()}
                  </div>
                  <div className="community-member-info">
                    <strong>{getMemberName(post.profile)}</strong>
                    <small>{getUsername(post.profile)} · {formatDate(post.created_at)}</small>
                  </div>
                  <div className="community-post-menu-actions">
                    <button
                      type="button"
                      className={`community-save-button ${savedPostIds.includes(post.id) ? "is-saved" : ""}`}
                      onClick={() => toggleSavedPost(post)}
                    >{savedPostIds.includes(post.id) ? "★ Saved" : "☆ Save"}</button>
                    {post.user_id === user.id ? (
                      <button type="button" className="community-delete" onClick={() => handleDeletePost(post)}>Delete</button>
                    ) : (
                      <button type="button" className="community-report-button" onClick={() => {
                        setReportingPost(post);
                        setReportReason("spam");
                        setReportDetails("");
                      }}>⚑ Report</button>
                    )}
                  </div>
                </div>

                {post.caption && <p className="community-caption">{post.caption}</p>}
                {post.hashtags?.length > 0 && (
                  <div className="community-post-hashtags">
                    {post.hashtags.map((tag) => (
                      <button type="button" key={tag} onClick={() => setSearchQuery(`#${tag}`)}>#{tag}</button>
                    ))}
                  </div>
                )}

                {post.imageUrl ? (
                  <img className="community-post-image" src={post.imageUrl} alt="Community post" />
                ) : (
                  <div className="community-image-error">Image unavailable. Refresh the feed.</div>
                )}

                <div className="community-post-actions">
                  <button type="button" className={liked ? "community-liked" : ""} onClick={() => handleLike(post)}>
                    {liked ? "♥" : "♡"} {post.likes.length} Likes
                  </button>
                  <button type="button" onClick={() => setOpenComments((previous) => ({ ...previous, [post.id]: !previous[post.id] }))}>
                    ◯ {post.comments.length} Comments
                  </button>
                </div>

                {openComments[post.id] && (
                  <div className="community-comments">
                    <div className="community-comment-list">
                      {post.comments.map((comment) => (
                        <div className="community-comment" key={comment.id}>
                          <strong>{getMemberName(comment.profile)}</strong>
                          <span>{comment.content}</span>
                        </div>
                      ))}
                      {post.comments.length === 0 && <p className="community-no-comments">No comments yet. Start the conversation!</p>}
                    </div>
                    <form className="community-comment-form" onSubmit={(event) => {
                      event.preventDefault();
                      handleComment(post);
                    }}>
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        maxLength={500}
                        value={commentInputs[post.id] || ""}
                        onChange={(event) => setCommentInputs((previous) => ({ ...previous, [post.id]: event.target.value }))}
                      />
                      <button type="submit" disabled={submittingComment === post.id}>
                        {submittingComment === post.id ? "..." : "Send"}
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* REPORT DIALOG */}
      {reportingPost && (
        <div className="community-report-overlay" onClick={() => setReportingPost(null)}>
          <form className="community-report-dialog" onClick={(event) => event.stopPropagation()} onSubmit={handleReportPost}>
            <span className="community-eyebrow">COMMUNITY SAFETY</span>
            <h2>Report this post</h2>
            <p>Choose the reason that best describes your concern. Reports are saved for review; they are not automatically moderated.</p>
            <label>
              Reason
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                {REPORT_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
              </select>
            </label>
            <label>
              Details (optional)
              <textarea value={reportDetails} maxLength={500} placeholder="Add context if you want..." onChange={(event) => setReportDetails(event.target.value)} />
            </label>
            <div className="community-report-actions">
              <button type="button" onClick={() => setReportingPost(null)}>Cancel</button>
              <button type="submit" disabled={submittingReport}>{submittingReport ? "Submitting..." : "Submit report"}</button>
            </div>
          </form>
        </div>
      )}

      {/* STORY VIEWER */}
      {activeStory && (
        <div className="community-story-overlay" onClick={() => setActiveStory(null)}>
          <div className="community-story-viewer" onClick={(event) => event.stopPropagation()}>
            <div className="community-story-progress"><span /></div>
            <div className="community-story-viewer-header">
              <div className="community-member-avatar">
                {activeStory.profile?.avatarUrl
                  ? <img src={activeStory.profile.avatarUrl} alt="Member" />
                  : getMemberName(activeStory.profile).charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{getMemberName(activeStory.profile)}</strong>
                <small>{getRemainingTime(activeStory.expires_at)}</small>
              </div>
              <button type="button" onClick={() => setActiveStory(null)}>✕</button>
            </div>

            {activeStory.imageUrl
              ? <img className="community-story-full-image" src={activeStory.imageUrl} alt="Story" />
              : <p>Story image unavailable.</p>}

            {activeStory.caption && <p className="community-story-caption">{activeStory.caption}</p>}

            {activeStory.user_id === user.id && (
              <div className="community-story-owner-actions">
                <span>👁 {storyViews.filter((view) => view.story_id === activeStory.id).length} views</span>
                <button type="button" onClick={() => handleDeleteStory(activeStory)}>Delete Story</button>
              </div>
            )}

            <button type="button" className="community-story-prev" onClick={() => moveStory(-1)} aria-label="Previous story">‹</button>
            <button type="button" className="community-story-next" onClick={() => moveStory(1)} aria-label="Next story">›</button>
          </div>
        </div>
      )}
    </div>
  );
}
