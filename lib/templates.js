export const TEMPLATES = {
  blank: { name: "Blank note", title: "", content: "" },
  meeting: {
    name: "Meeting Notes", title: "Meeting Notes",
    content: "<h2>Meeting Notes</h2><p><strong>Date:</strong> </p><p><strong>Attendees:</strong> </p><h3>Agenda</h3><ul><li><p></p></li></ul><h3>Discussion</h3><p></p><h3>Action items</h3><ul data-type=\"taskList\"><li data-type=\"taskItem\" data-checked=\"false\"><label><input type=\"checkbox\"><span></span></label><div><p></p></div></li></ul>",
  },
  journal: {
    name: "Daily Journal", title: "Daily Journal",
    content: "<h2>Daily Journal</h2><h3>Today I'm grateful for</h3><ul><li><p></p></li></ul><h3>What happened today</h3><p></p><h3>What I learned</h3><p></p><h3>Tomorrow</h3><p></p>",
  },
  todo: {
    name: "To-do List", title: "To-do List",
    content: "<h2>To-do List</h2><ul data-type=\"taskList\"><li data-type=\"taskItem\" data-checked=\"false\"><label><input type=\"checkbox\"><span></span></label><div><p></p></div></li></ul>",
  },
  project: {
    name: "Project Documentation", title: "Project Documentation",
    content: "<h1>Project name</h1><h2>Overview</h2><p></p><h2>Goals</h2><ul><li><p></p></li></ul><h2>Architecture</h2><p></p><h2>Setup</h2><pre><code class=\"language-bash\"># install\n</code></pre><h2>Roadmap</h2><ul><li><p></p></li></ul>",
  },
  snippets: {
    name: "Code Snippets", title: "Code Snippets",
    content: "<h2>Code Snippets</h2><h3>Snippet title</h3><p>What it does.</p><pre><code class=\"language-javascript\">// code here\n</code></pre>",
  },
  study: {
    name: "Study Notes", title: "Study Notes",
    content: "<h2>Study Notes</h2><p><strong>Subject:</strong> </p><h3>Key concepts</h3><ul><li><p></p></li></ul><h3>Summary</h3><p></p><h3>Questions to review</h3><ol><li><p></p></li></ol>",
  },
};
