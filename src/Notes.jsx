import { useEffect, useMemo, useRef, useState } from "react";
import { createWorker } from "tesseract.js";
import "./Notes.css";

const KEY = "project-x-notes-v1";
const initialFolder = {
  id: "general",
  name: "General",
  color: "#91e6c2",
};

const makeId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function loadData() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null");

    if (
      data &&
      Array.isArray(data.folders) &&
      Array.isArray(data.notes)
    ) {
      return {
        folders: data.folders.length
          ? data.folders
          : [initialFolder],
        notes: data.notes,
      };
    }
  } catch (error) {
    console.warn("Notes could not be loaded", error);
  }

  return { folders: [initialFolder], notes: [] };
}

// Prepare a brighter, grayscale image for OCR.
async function prepareImage(file) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    const canvas = document.createElement("canvas");

    // Upscale small pages without creating excessively large images.
    const scale = Math.min(
      2,
      2400 / Math.max(img.naturalWidth, img.naturalHeight)
    );

    const factor = Math.max(1, scale);

    canvas.width = Math.round(img.naturalWidth * factor);
    canvas.height = Math.round(img.naturalHeight * factor);

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not process the image.");
    }

    ctx.filter = "grayscale(1) contrast(1.2) brightness(1.05)";

    ctx.drawImage(
      img,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function studyFrom(text) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 12);

  const sentences = text
    .split(/(?<=[.!?।])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 18);

  const source = sentences.length ? sentences : lines;

  return {
    summary: source.slice(0, 5),

    questions: source.slice(0, 10).map((line) => {
      const shortLine =
        line.length > 120
          ? line.slice(0, 117) + "…"
          : line;

      return /[\u0900-\u097F]/.test(line)
        ? `अपने शब्दों में समझाइए: ${shortLine}`
        : `Explain in your own words: ${shortLine}`;
    }),

    definitions: lines
      .filter((line) =>
        /\bis\b|\bare\b|\bmeans\b|\brefers to\b|\bdefined as\b|कहलाता|कहलाती|कहते हैं|अर्थ है|परिभाषा/i.test(
          line
        )
      )
      .slice(0, 12),

    quiz: source.slice(0, 8),
  };
}

export default function Notes({ onBack }) {
  const [data, setData] = useState(loadData);
  const [folder, setFolder] = useState("all");
  const [noteId, setNoteId] = useState(null);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");

  const [search, setSearch] = useState("");
  const [folderInput, setFolderInput] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);

  const [tab, setTab] = useState("summary");

  const [language, setLanguage] = useState("eng");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const [toast, setToast] = useState("");

  const photoInput = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      setToast(
        "Storage is full. Remove a large photo and try again."
      );
    }
  }, [data]);

  const current = data.notes.find((note) => note.id === noteId);

  const visible = useMemo(
    () =>
      data.notes.filter(
        (note) =>
          (folder === "all" || note.folderId === folder) &&
          (!search.trim() ||
            `${note.title} ${note.text}`
              .toLowerCase()
              .includes(search.toLowerCase()))
      ),
    [data.notes, folder, search]
  );

  const study = studyFrom(text);

  function flash(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  function newNote() {
    setNoteId(null);
    setTitle("");
    setText("");
    setImage("");
    setImageName("");
    setOcrStatus("");
    setTab("summary");
  }

  function openNote(note) {
    setNoteId(note.id);
    setTitle(note.title);
    setText(note.text);
    setImage(note.image || "");
    setImageName(note.imageName || "");
    setOcrStatus("");
    setTab("summary");
  }

  function saveNote() {
    const note = {
      id: noteId || makeId(),
      title: title.trim() || "Untitled chapter",
      text,
      image,
      imageName,
      folderId:
        folder !== "all"
          ? folder
          : current?.folderId || "general",
      updatedAt: new Date().toISOString(),
    };

    setData((previous) => ({
      ...previous,
      notes: noteId
        ? previous.notes.map((item) =>
            item.id === noteId ? note : item
          )
        : [note, ...previous.notes],
    }));

    setNoteId(note.id);
    setTitle(note.title);

    flash("Note saved on this device ✓");
  }

  function addFolder(event) {
    event.preventDefault();

    const name = folderInput.trim();

    if (!name) return;

    if (
      data.folders.some(
        (item) => item.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      flash("That folder already exists.");
      return;
    }

    const colors = [
      "#91e6c2",
      "#a8b7ff",
      "#ffd08a",
      "#f2a9d6",
    ];

    const newFolder = {
      id: makeId(),
      name,
      color: colors[data.folders.length % colors.length],
    };

    setData((previous) => ({
      ...previous,
      folders: [...previous.folders, newFolder],
    }));

    setFolder(newFolder.id);
    setFolderInput("");
    setAddingFolder(false);
  }

  function removeNote(note) {
    if (!confirm(`Delete "${note.title}"?`)) return;

    setData((previous) => ({
      ...previous,
      notes: previous.notes.filter(
        (item) => item.id !== note.id
      ),
    }));

    if (note.id === noteId) newNote();
  }

  function editFolder(item) {
    const name = prompt("New folder name:", item.name);

    if (!name?.trim()) return;

    setData((previous) => ({
      ...previous,
      folders: previous.folders.map((folderItem) =>
        folderItem.id === item.id
          ? { ...folderItem, name: name.trim() }
          : folderItem
      ),
    }));
  }

  function removeFolder(item) {
    if (
      !confirm(
        `Delete "${item.name}"? Notes will move to General.`
      )
    ) {
      return;
    }

    setData((previous) => ({
      folders: previous.folders.filter(
        (folderItem) => folderItem.id !== item.id
      ),
      notes: previous.notes.map((note) =>
        note.folderId === item.id
          ? { ...note, folderId: "general" }
          : note
      ),
    }));

    if (folder === item.id) setFolder("all");
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      flash("Choose an image file.");
      return;
    }

    // Keep the original photo attached to the note.
    const reader = new FileReader();

    reader.onload = () => {
      setImage(String(reader.result || ""));
      setImageName(file.name);
    };

    reader.onerror = () => {
      flash("Could not read this photo.");
    };

    reader.readAsDataURL(file);

    setOcrBusy(true);
    setOcrStatus("Preparing your photo…");

    let worker;

    try {
      const processedImage = await prepareImage(file);

      setOcrStatus(
        language === "hin"
          ? "Reading Hindi text…"
          : language === "eng+hin"
            ? "Reading Hindi and English…"
            : "Reading English text…"
      );

      // Tesseract downloads the selected language data when needed.
      worker = await createWorker(language);

      const result = await worker.recognize(processedImage);

      const extracted = result.data.text.trim();

      if (extracted) {
        setText((previous) =>
          previous.trim()
            ? `${previous.trim()}\n\n${extracted}`
            : extracted
        );

        setOcrStatus(
          `Text extracted successfully. Review spelling before saving. ${
            Math.round(result.data.confidence || 0)
          }% OCR confidence.`
        );
      } else {
        setOcrStatus(
          "No readable text found. Try a clearer, well-lit photo."
        );
      }
    } catch (error) {
      console.error("OCR error:", error);

      setOcrStatus(
        "OCR could not finish. Check your internet connection and try again."
      );
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (error) {
          console.warn("Could not stop OCR worker", error);
        }
      }

      setOcrBusy(false);
      event.target.value = "";
    }
  }

  return (
    <main className="notes-page">
      <div className="notes-shell">
        <header className="notes-topbar">
          <button className="notes-back" onClick={onBack}>
            ← Back to Project X
          </button>

          <span className="notes-brand">
            PROJECT X <i>/ NOTES STUDIO</i>
          </span>

          <span className="notes-local">
            <b /> SAVED LOCALLY
          </span>
        </header>

        <section className="notes-hero">
          <div>
            <p className="notes-eyebrow">
              CAPTURE • ORGANISE • REVISE
            </p>

            <h1>
              Your ideas, <span>in order.</span>
            </h1>

            <p>
              Build your chapter library, turn photos into
              editable text, and prepare revision material.
            </p>
          </div>

          <div className="notes-hero-icon">▤</div>
        </section>

        <div className="notes-layout">
          <aside className="notes-panel notes-folders">
            <div className="notes-panel-heading">
              <div>
                <small>YOUR LIBRARY</small>
                <h2>Folders</h2>
              </div>

              <button
                className="notes-plus"
                onClick={() => setAddingFolder((value) => !value)}
              >
                ＋
              </button>
            </div>

            {addingFolder && (
              <form
                className="notes-folder-form"
                onSubmit={addFolder}
              >
                <input
                  autoFocus
                  value={folderInput}
                  onChange={(event) =>
                    setFolderInput(event.target.value)
                  }
                  placeholder="Folder name"
                  maxLength={40}
                />

                <button>Create</button>
              </form>
            )}

            <button
              className={`notes-folder-row ${
                folder === "all" ? "active" : ""
              }`}
              onClick={() => setFolder("all")}
            >
              <span>▤</span>
              All notes
              <b>{data.notes.length}</b>
            </button>

            {data.folders.map((item) => (
              <div
                className={`notes-folder-wrap ${
                  folder === item.id ? "active" : ""
                }`}
                key={item.id}
              >
                <button
                  className={`notes-folder-row ${
                    folder === item.id ? "active" : ""
                  }`}
                  onClick={() => setFolder(item.id)}
                >
                  <span style={{ color: item.color }}>▰</span>
                  {item.name}

                  <b>
                    {
                      data.notes.filter(
                        (note) => note.folderId === item.id
                      ).length
                    }
                  </b>
                </button>

                {item.id !== "general" && (
                  <div className="notes-folder-tools">
                    <button
                      onClick={() => editFolder(item)}
                      title="Rename"
                    >
                      ✎
                    </button>

                    <button
                      onClick={() => removeFolder(item)}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}

            <p className="notes-tip">
              ✦ Tip: make a separate folder for each subject or exam.
            </p>
          </aside>

          <section className="notes-panel notes-list-panel">
            <div className="notes-panel-heading">
              <div>
                <small>YOUR COLLECTION</small>

                <h2>
                  {folder === "all"
                    ? "All notes"
                    : data.folders.find(
                        (item) => item.id === folder
                      )?.name || "Notes"}
                </h2>
              </div>

              <button className="notes-new" onClick={newNote}>
                ＋ New note
              </button>
            </div>

            <input
              className="notes-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="⌕ Search your notes…"
            />

            <div className="notes-items">
              {visible.length ? (
                visible.map((note) => (
                  <button
                    className={`notes-item ${
                      noteId === note.id ? "active" : ""
                    }`}
                    key={note.id}
                    onClick={() => openNote(note)}
                  >
                    <span className="notes-item-icon">
                      {note.image ? "▧" : "▤"}
                    </span>

                    <span className="notes-item-copy">
                      <strong>{note.title}</strong>

                      <small>
                        {note.text.slice(0, 70) || "No text yet"}
                        {note.text.length > 70 ? "…" : ""}
                      </small>

                      <em>
                        {data.folders.find(
                          (item) => item.id === note.folderId
                        )?.name || "General"}
                      </em>
                    </span>

                    <span>↗</span>
                  </button>
                ))
              ) : (
                <div className="notes-empty">
                  <span>✧</span>
                  <h3>No notes here yet.</h3>
                  <p>
                    Create a note or upload a chapter photo to start.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="notes-panel notes-editor">
            <div className="notes-panel-heading">
              <div>
                <small>
                  {noteId ? "EDIT YOUR NOTE" : "NEW STUDY NOTE"}
                </small>

                <h2>
                  {noteId ? "Keep learning." : "Start writing."}
                </h2>
              </div>

              {current && (
                <button
                  className="notes-delete"
                  onClick={() => removeNote(current)}
                >
                  Delete
                </button>
              )}
            </div>

            <input
              className="notes-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Chapter title…"
              maxLength={100}
            />

            <div className="notes-upload-row">
              <button
                onClick={() => photoInput.current?.click()}
                disabled={ocrBusy}
              >
                ▧ Upload chapter photo
              </button>

              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                hidden
                onChange={uploadPhoto}
              />

              <select
                aria-label="OCR language"
                value={language}
                disabled={ocrBusy}
                onChange={(event) => setLanguage(event.target.value)}
                style={{
                  background: "#101b18",
                  color: "#91e6c2",
                  border: "1px solid #91e6c244",
                  borderRadius: "8px",
                  padding: "8px",
                  fontSize: "11px",
                  maxWidth: "155px",
                }}
              >
                <option value="eng">English OCR</option>
                <option value="hin">Hindi OCR</option>
                <option value="eng+hin">Hindi + English</option>
              </select>
            </div>

            {image && (
              <div className="notes-photo">
                <img src={image} alt="Uploaded chapter page" />

                <div>
                  <strong>{imageName}</strong>
                  <small>Attached to this note</small>

                  <button
                    onClick={() => {
                      setImage("");
                      setImageName("");
                    }}
                  >
                    Remove photo
                  </button>
                </div>
              </div>
            )}

            {ocrStatus && (
              <p className="notes-ocr-status" role="status">
                {ocrBusy ? "◌ " : "✓ "}
                {ocrStatus}
              </p>
            )}

            <textarea
              className="notes-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write notes here, or upload a chapter photo to extract its text…"
            />

            <div className="notes-save-row">
              <span>
                {text.trim()
                  ? text.trim().split(/\s+/).length
                  : 0}{" "}
                words
              </span>

              <button className="notes-save" onClick={saveNote}>
                Save note ✓
              </button>
            </div>

            <div className="notes-tools">
              <div className="notes-tabs">
                {[
                  ["summary", "Summary"],
                  ["questions", "Questions"],
                  ["definitions", "Definitions"],
                  ["quiz", "Revision quiz"],
                ].map(([id, label]) => (
                  <button
                    className={tab === id ? "active" : ""}
                    key={id}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="notes-output">
                {!text.trim() ? (
                  <p>
                    Add or extract chapter text to prepare revision
                    material.
                  </p>
                ) : tab === "summary" ? (
                  study.summary.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))
                ) : tab === "questions" ? (
                  <ol>
                    {study.questions.map((question, index) => (
                      <li key={index}>{question}</li>
                    ))}
                  </ol>
                ) : tab === "definitions" ? (
                  study.definitions.length ? (
                    <ul>
                      {study.definitions.map((line, index) => (
                        <li key={index}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      No clear definition-style lines found yet.
                      Check your chapter text or add definitions
                      manually.
                    </p>
                  )
                ) : (
                  <ol>
                    {study.quiz.map((line, index) => (
                      <li key={index}>
                        <strong>{line}</strong>

                        <details>
                          <summary>Show source answer</summary>
                          <p>{line}</p>
                        </details>
                      </li>
                    ))}
                  </ol>
                )}

                <p className="notes-disclaimer">
                  These study tools use text-based rules, not an AI
                  model. Review the results before studying.
                </p>
              </div>
            </div>
          </section>
        </div>

        <footer className="notes-footer">
          <span>PROJECT X / NOTES STUDIO</span>
          <span>YOUR STUDY SPACE, YOUR WAY.</span>
        </footer>
      </div>

      {toast && (
        <div className="notes-toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}