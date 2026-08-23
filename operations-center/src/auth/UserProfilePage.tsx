import { useEffect, useMemo, useState } from "react"
import {
  apiFetch,
  clearToken,
  getContextToken,
  getToken,
} from "../api"
import { getUserFromToken, parseJwt } from "./jwt"
import "../styles/ui.css"
import "./user-profile.css"

type UserProfile = {
  display_name?: string
  first_name?: string
  last_name?: string
  preferred_name?: string
  title?: string
  department?: string
  team?: string
  organization?: string
  location?: string
  timezone?: string
  phone?: string
  avatar_url?: string
  website?: string
  bio?: string
}

type ProfileField = {
  key: keyof UserProfile
  label: string
  type?: "text" | "tel" | "url"
  placeholder?: string
}

const EMPTY_PROFILE: Required<UserProfile> = {
  display_name: "",
  first_name: "",
  last_name: "",
  preferred_name: "",
  title: "",
  department: "",
  team: "",
  organization: "",
  location: "",
  timezone: "",
  phone: "",
  avatar_url: "",
  website: "",
  bio: "",
}

const PERSONAL_FIELDS: ProfileField[] = [
  { key: "display_name", label: "Display Name", placeholder: "Andrew Campagna" },
  { key: "first_name", label: "First Name", placeholder: "Andrew" },
  { key: "last_name", label: "Last Name", placeholder: "Campagna" },
  { key: "preferred_name", label: "Preferred Name", placeholder: "Andrew" },
]

const WORK_FIELDS: ProfileField[] = [
  { key: "title", label: "Title", placeholder: "Senior DevOps Engineer" },
  { key: "department", label: "Department", placeholder: "Engineering" },
  { key: "team", label: "Team", placeholder: "Platform" },
  { key: "organization", label: "Organization", placeholder: "Herringbone" },
]

const CONTACT_FIELDS: ProfileField[] = [
  { key: "location", label: "Location", placeholder: "Austin, TX" },
  { key: "timezone", label: "Timezone", placeholder: "America/Chicago" },
  { key: "phone", label: "Phone", type: "tel", placeholder: "+1 555 555 0100" },
  { key: "website", label: "Website", type: "url", placeholder: "https://example.com" },
  { key: "avatar_url", label: "Avatar URL", type: "url", placeholder: "https://example.com/avatar.png" },
]

function formatTime(ts: unknown) {
  if (typeof ts !== "number") return "-"

  const d = new Date(ts * 1000)
  if (Number.isNaN(d.getTime())) return "-"

  return d.toLocaleString()
}

function copy(text?: string) {
  if (!text) return
  void navigator.clipboard.writeText(text)
}

function normalizeProfile(value: unknown): UserProfile | null {
  if (!value || typeof value !== "object") return null

  const raw = value as Record<string, unknown>
  const result: UserProfile = {}

  for (const key of Object.keys(EMPTY_PROFILE) as Array<keyof UserProfile>) {
    const field = raw[key]
    if (typeof field === "string") result[key] = field
  }

  return result
}

function toFormProfile(profile: UserProfile | null): Required<UserProfile> {
  return {
    ...EMPTY_PROFILE,
    ...(profile || {}),
  }
}

function getDisplayName(profile: UserProfile | null, email?: string) {
  return (
    profile?.display_name ||
    profile?.preferred_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    email ||
    "User"
  )
}

function profileInitials(profile: UserProfile | null, email?: string) {
  const name = getDisplayName(profile, email).trim()
  const parts = name.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }

  return name.slice(0, 2).toUpperCase()
}

function readError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === "string" && detail) return detail
  }

  return fallback
}

export default function UserProfilePage() {
  const user = getUserFromToken()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState<Required<UserProfile>>(EMPTY_PROFILE)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(
    () => getContextToken() || getToken()
  )

  const payload = useMemo(() => parseJwt(sessionToken), [sessionToken])

  const contextId =
    localStorage.getItem("hb_context_id") ||
    (typeof payload?.context_id === "string" ? payload.context_id : "default")

  const displayName = getDisplayName(profile, user?.email)
  const initials = profileInitials(profile, user?.email)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    void loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch("/herringbone/auth/user_profile/get")

      setSessionToken(getContextToken() || getToken())

      if (res.status === 404) {
        setProfile(null)
        setForm(EMPTY_PROFILE)
        return
      }

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(readError(data, `HTTP ${res.status}`))
      }

      const loaded = normalizeProfile(data?.profile)
      setProfile(loaded)
      setForm(toFormProfile(loaded))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load profile")
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await apiFetch("/herringbone/auth/user_profile/set", {
        method: "POST",
        body: JSON.stringify(form),
      })

      setSessionToken(getContextToken() || getToken())

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(readError(data, `HTTP ${res.status}`))
      }

      const updated = normalizeProfile(data?.profile) || { ...form }

      setProfile(updated)
      setForm(toFormProfile(updated))
      setEditing(false)
      setSuccess("Profile updated successfully")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile")
    } finally {
      setSaving(false)
    }
  }

  function updateField(field: keyof UserProfile, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function startEditing() {
    setForm(toFormProfile(profile))
    setError(null)
    setSuccess(null)
    setEditing(true)
  }

  function cancelEditing() {
    setForm(toFormProfile(profile))
    setError(null)
    setEditing(false)
  }

  function logout() {
    clearToken()
    window.location.href = "/login"
  }

  if (!user) {
    return (
      <div className="hb-page">
        <div className="hb-header">
          <h1 className="hb-title">User Profile</h1>
          <div className="hb-subtitle">
            Account identity, profile, and session information
          </div>
        </div>

        <div className="hb-card">
          <div className="hb-alert-error">Not authenticated</div>
        </div>
      </div>
    )
  }

  return (
    <div className="hb-page hb-profile-page">
      <div className="hb-header">
        <h1 className="hb-title">User Profile</h1>
        <div className="hb-subtitle">
          Account identity, profile, and session information
        </div>
      </div>

      <div className="hb-card hb-profile-card">
        <div className="hb-profile-hero">
          <div className="hb-profile-identity">
            {profile?.avatar_url ? (
              <img
                className="hb-profile-avatar"
                src={profile.avatar_url}
                alt={displayName}
              />
            ) : (
              <div className="hb-profile-avatar hb-profile-avatar-fallback">
                {initials}
              </div>
            )}

            <div className="hb-profile-identity-text">
              <div className="hb-profile-name">{displayName}</div>

              {profile?.title && (
                <div className="hb-profile-title-text">{profile.title}</div>
              )}

              <div className="hb-subtitle">{user.email}</div>
            </div>
          </div>

          {!editing && !loading && (
            <button className="hb-button-secondary" onClick={startEditing}>
              {profile ? "Edit Profile" : "Create Profile"}
            </button>
          )}
        </div>

        {loading && <div className="hb-empty">Loading profile...</div>}

        {error && <div className="hb-alert-error">{error}</div>}

        {success && <div className="hb-profile-success">{success}</div>}

        {!loading && editing && (
          <div className="hb-profile-editor">
            <ProfileEditorSection
              title="Personal"
              fields={PERSONAL_FIELDS}
              form={form}
              onChange={updateField}
            />

            <ProfileEditorSection
              title="Work"
              fields={WORK_FIELDS}
              form={form}
              onChange={updateField}
            />

            <ProfileEditorSection
              title="Contact"
              fields={CONTACT_FIELDS}
              form={form}
              onChange={updateField}
            />

            <div className="hb-profile-edit-section">
              <div className="hb-profile-edit-section-title">Bio</div>

              <label className="hb-profile-field hb-profile-field-wide">
                <span className="hb-profile-field-label">Bio</span>
                <textarea
                  className="hb-profile-textarea"
                  rows={5}
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  placeholder="Tell people a little about yourself"
                />
              </label>
            </div>

            <div className="hb-profile-edit-actions">
              <button
                className="hb-button-secondary"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="hb-button"
                onClick={() => void saveProfile()}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}

        {!loading && !editing && profile && (
          <div className="hb-profile-details">
            <ProfileSection
              title="Personal"
              items={[
                ["Display Name", profile.display_name],
                ["First Name", profile.first_name],
                ["Last Name", profile.last_name],
                ["Preferred Name", profile.preferred_name],
              ]}
            />

            <ProfileSection
              title="Work"
              items={[
                ["Title", profile.title],
                ["Department", profile.department],
                ["Team", profile.team],
                ["Organization", profile.organization],
              ]}
            />

            <ProfileSection
              title="Contact"
              items={[
                ["Location", profile.location],
                ["Timezone", profile.timezone],
                ["Phone", profile.phone],
                ["Website", profile.website],
              ]}
              linkLabel="Website"
            />

            {profile.bio && (
              <div className="hb-profile-section">
                <div className="hb-profile-section-title">Bio</div>
                <div className="hb-profile-bio">{profile.bio}</div>
              </div>
            )}
          </div>
        )}

        {!loading && !editing && !profile && !error && (
          <div className="hb-profile-empty-state">
            <div className="hb-profile-empty-title">No profile configured</div>
            <div className="hb-subtitle">
              Add your name, title, organization, location, and other profile details.
            </div>

            <button className="hb-button" onClick={startEditing}>
              Create Profile
            </button>
          </div>
        )}

        <div className="hb-section-divider" />

        <div className="hb-profile-section">
          <div className="hb-profile-section-title">Identity</div>

          <div className="hb-profile-grid">
            <ProfileIdentityRow
              label="Email"
              value={user.email || "-"}
              copyValue={user.email}
            />

            <ProfileIdentityRow
              label="User ID"
              value={user.id}
              copyValue={user.id}
              mono
            />

            <ProfileIdentityRow
              label="Context"
              value={contextId}
              mono={contextId !== "default"}
            />
          </div>
        </div>

        <div className="hb-section-divider" />

        <div className="hb-profile-section">
          <div className="hb-profile-section-title">Session</div>

          <div className="hb-profile-grid">
            <ProfileIdentityRow
              label="Issuer"
              value={typeof payload?.iss === "string" ? payload.iss : "-"}
            />

            <ProfileIdentityRow
              label="Issued"
              value={formatTime(payload?.iat)}
            />

            <ProfileIdentityRow
              label="Expires"
              value={formatTime(payload?.exp)}
            />

            <ProfileIdentityRow
              label="Token Type"
              value={getContextToken() ? "Context token" : "Base token"}
            />
          </div>
        </div>

        <div className="hb-section-divider" />

        <div className="hb-actions">
          <button
            className="hb-button-secondary"
            onClick={() => setShowToken((value) => !value)}
          >
            {showToken ? "Hide Token" : "Show Token"}
          </button>

          <button className="hb-button-danger" onClick={logout}>
            Logout
          </button>
        </div>

        {showToken && sessionToken && (
          <div className="hb-profile-token">
            <div className="hb-profile-token-warning">
              Warning: This token grants API access. Do not share it.
            </div>

            <pre className="hb-code-block">{sessionToken}</pre>

            <button
              className="hb-button-secondary"
              onClick={() => copy(sessionToken)}
            >
              Copy Token
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileEditorSection({
  title,
  fields,
  form,
  onChange,
}: {
  title: string
  fields: ProfileField[]
  form: Required<UserProfile>
  onChange: (field: keyof UserProfile, value: string) => void
}) {
  return (
    <div className="hb-profile-edit-section">
      <div className="hb-profile-edit-section-title">{title}</div>

      <div className="hb-profile-form-grid">
        {fields.map((field) => (
          <label className="hb-profile-field" key={field.key}>
            <span className="hb-profile-field-label">{field.label}</span>
            <input
              className="hb-input hb-profile-input"
              type={field.type || "text"}
              value={form[field.key]}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

function ProfileSection({
  title,
  items,
  linkLabel,
}: {
  title: string
  items: Array<[string, string | undefined]>
  linkLabel?: string
}) {
  const visible = items.filter(([, value]) => Boolean(value))
  if (!visible.length) return null

  return (
    <div className="hb-profile-section">
      <div className="hb-profile-section-title">{title}</div>

      <div className="hb-profile-grid">
        {visible.map(([label, value]) => (
          <div className="hb-profile-row" key={label}>
            <div className="hb-profile-label">{label}</div>
            <div className="hb-profile-value">
              {linkLabel === label && value ? (
                <a href={value} target="_blank" rel="noreferrer">
                  {value}
                </a>
              ) : (
                value
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileIdentityRow({
  label,
  value,
  copyValue,
  mono = false,
}: {
  label: string
  value: string
  copyValue?: string
  mono?: boolean
}) {
  return (
    <div className="hb-profile-row">
      <div className="hb-profile-label">{label}</div>

      <div className={`hb-profile-value ${mono ? "hb-mono" : ""}`}>
        <span className="hb-profile-value-text">{value}</span>

        {copyValue && (
          <button
            className="hb-button-secondary hb-profile-copy-button"
            onClick={() => copy(copyValue)}
          >
            Copy
          </button>
        )}
      </div>
    </div>
  )
}