export default {
  async fetch(request, env) {
    // ---- 1. CORS ----
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    // ---- 2. Parse Form Submission ----
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { name, email, message } = data;

    // ---- 3. EMAIL via Mailgun API ----
    const mg_domain = env.MAILGUN_DOMAIN;          // e.g. mg.yourdomain.com
    const mg_key = env.MAILGUN_APIKEY;             // secret key

    const mailgunURL = `https://api.mailgun.net/v3/${mg_domain}/messages`;

    const emailBody = new URLSearchParams();
    emailBody.append("from", `SwamiG Institute <postmaster@${mg_domain}>`);
    emailBody.append("to", "app@swamiginstitute.com");
    emailBody.append("subject", "New SGI Application Submission");
    emailBody.append(
      "text",
      `New submission:\n\nName: ${name}\nEmail: ${email}\nMessage:\n${message}`
    );

    const mailgunResp = await fetch(mailgunURL, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`api:${mg_key}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: emailBody,
    });

    // ---- 4. SAVE TO GITHUB AS JSON ----
    const github_token = env.GITHUB_TOKEN; // Secret PAT
    const repo = env.GITHUB_REPO;          // "username/repo"
    const folder = env.GITHUB_FOLDER;      // "applications/submissions"

    const filename = `submission_${Date.now()}.json`;
    const githubURL = `https://api.github.com/repos/${repo}/contents/${folder}/${filename}`;

    const encodedContent = btoa(JSON.stringify(data, null, 2));

    const githubResp = await fetch(githubURL, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${github_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `New submission ${filename}`,
        content: encodedContent,
      }),
    });

    // ---- 5. REDIRECT TO THANK YOU PAGE ----
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: "https://swamiginstitute.com/thankyou.html",
      },
    });
  },
};
