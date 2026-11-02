import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./ShadowProfile.css";

export default function ShadowProfile({ user, onClose }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  async function loadProfile() {
    if (!user?.id) return;

    setLoading(true);
    setError("");

    try {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(data);
      setUsername(data.username || "");
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");

      if (data.avatar_url) {
        const { data: imageData } = await supabase.storage
          .from("shadow-posts")
          .createSignedUrl(data.avatar_url, 3600);

        setAvatarPreview(imageData?.signedUrl || "");
      }

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("id, image_path, caption, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (postError) throw postError;

      const enrichedPosts = await Promise.all(
        (postData || []).map(async (post) => {
          const { data: imageData } = await supabase.storage
            .from("shadow-posts")
            .createSignedUrl(post.image_path, 3600);

          return {
            ...post,
            imageUrl: imageData?.signedUrl || "",
          };
        })
      );

      setPosts(enrichedPosts);
    } catch (err) {
      console.error("Profile loading error:", err);
      setError(err.message || "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

    if (
      cleanUsername &&
      !/^[a-z0-9_]{3,20}$/.test(cleanUsername)
    ) {
      setError(
        "Username must be 3–20 characters and use only letters, numbers or underscores."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    let newAvatarPath = null;

    try {
      if (avatar) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(avatar.type)) {
          throw new Error("Use a JPG, PNG or WEBP profile picture.");
        }

        if (avatar.size > 5 * 1024 * 1024) {
          throw new Error("Profile picture must be smaller than 5 MB.");
        }

        const extension = avatar.name.split(".").pop().toLowerCase();

        newAvatarPath = `${user.id}/avatar-${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("shadow-posts")
          .upload(newAvatarPath, avatar, {
            contentType: avatar.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;
      }

      const updates = {
        username: cleanUsername || null,
        display_name: displayName.trim(),
        bio: bio.trim(),
      };

      if (newAvatarPath) {
        updates.avatar_url = newAvatarPath;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (updateError) throw updateError;

      if (newAvatarPath && profile?.avatar_url) {
        const { error: removeError } = await supabase.storage
          .from("shadow-posts")
          .remove([profile.avatar_url]);

        if (removeError) {
          console.warn("Old avatar cleanup failed:", removeError);
        }
      }

      setAvatar(null);
      setSuccess("Profile updated successfully! ✨");

      await loadProfile();
    } catch (err) {
      if (newAvatarPath) {
        await supabase.storage
          .from("shadow-posts")
          .remove([newAvatarPath]);
      }

      console.error("Profile update error:", err);

      setError(
        err.code === "23505"
          ? "This username is already taken."
          : err.message || "Could not update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  if (loading) {
    return (
      <div className="shadow-profile-loading">
        ◈ Loading your identity...
      </div>
    );
  }

  return (
    <div className="shadow-profile-page">
      <div className="shadow-profile-heading">
        <div>
          <span>◈ SHADOW REALM / IDENTITY</span>
          <h1>
            Your <strong>Profile.</strong>
          </h1>
          <p>Your identity inside the realm.</p>
        </div>

        <button type="button" onClick={onClose}>
          ← Back
        </button>
      </div>

      {error && (
        <div className="shadow-profile-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="shadow-profile-success">
          {success}
        </div>
      )}

      <section className="shadow-profile-card">
        <div className="shadow-profile-cover">
          <span>PROJECT X / MEMBER IDENTITY</span>
          <span>◈ VERIFIED MEMBER</span>
        </div>

        <form onSubmit={handleSave}>
          <div className="shadow-profile-main">
            <div className="shadow-profile-photo">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" />
              ) : (
                <span>
                  {displayName.charAt(0).toUpperCase() || "M"}
                </span>
              )}

              <label htmlFor="shadow-avatar-upload">
                +
              </label>

              <input
                id="shadow-avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handleAvatarChange}
              />
            </div>

            <div className="shadow-profile-stats">
              <div>
                <strong>{posts.length}</strong>
                <span>POSTS</span>
              </div>

              <div>
                <strong>
                  {posts.filter((post) => post.id).length}
                </strong>
                <span>MOMENTS</span>
              </div>
            </div>
          </div>

          <div className="shadow-profile-fields">
            <label>
              Display Name
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={40}
                placeholder="Your display name"
              />
            </label>

            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                maxLength={20}
                placeholder="your_username"
              />
              <small>3–20 characters · Letters, numbers and _</small>
            </label>

            <label>
              About You
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={160}
                placeholder="Write something about yourself..."
              />
              <small>{bio.length}/160 characters</small>
            </label>

            <button
              type="submit"
              className="shadow-profile-save"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes ↗"}
            </button>
          </div>
        </form>
      </section>

      <section className="shadow-profile-gallery">
        <div className="shadow-profile-gallery-heading">
          <div>
            <span>YOUR COLLECTION</span>
            <h2>My Moments</h2>
          </div>

          <span>{posts.length} POSTS</span>
        </div>

        {posts.length === 0 ? (
          <div className="shadow-profile-no-posts">
            <span>✳</span>
            <h3>Your story starts here.</h3>
            <p>Your published photos will appear here.</p>
          </div>
        ) : (
          <div className="shadow-profile-grid">
            {posts.map((post) => (
              <div
                className="shadow-profile-grid-item"
                key={post.id}
              >
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="Your post" />
                ) : (
                  <span>Image unavailable</span>
                )}

                {post.caption && (
                  <div className="shadow-profile-grid-caption">
                    {post.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}