/* eslint-disable max-len, valid-jsdoc */
// functions/index.js
// When a booking is created, queue two kinds of email for the Trigger Email
// extension: one to every admin, and an acknowledgement to the person who
// booked. Runs with admin access, so browsers never see admin emails and
// never write to the "mail" collection for these notifications.

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {logger} = require("firebase-functions");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// Must match your Firestore database location (Firebase Console > Firestore > Data).
const REGION = "australia-southeast2";
const SITE_URL = "https://booking-baitussalam.web.app";
const HERO_IMG = `${SITE_URL}/baitussalam.jpg`;

// ---------- helpers (same behaviour as bookingService.js) ----------

/** Escapes user-typed text before it goes into an HTML email */
const esc = (value) =>
  String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

/** YYYY-MM-DD -> DD-MM-YYYY (anything else is shown as is) */
const formatDateDMY = (d) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d.split("-").reverse().join("-") : d || "";

/** All dates of a booking (recurring bookings use allDates) */
const getBookingDates = (data) =>
  (data.allDates?.length ? data.allDates : [data.date]).filter(Boolean);

/** HTML for the date(s) cell. Single date = plain text, several = stacked list. */
const buildDatesHtml = (dates, itemStyle = "") =>
  dates.length > 1 ?
    `<div style="text-align: right;">${dates
        .map(
            (d) =>
              `<div style="margin-bottom: 2px; ${itemStyle}">${formatDateDMY(d)}</div>`,
        )
        .join("")}</div>` :
    `<span style="${itemStyle}">${formatDateDMY(dates[0])}</span>`;

/** Label/value rows describing who the booking is for */
const getOrganisationRows = (data) => {
  if (data.organisationType === "auxiliary") {
    const rows = [];
    if (data.auxiliaries?.length) {
      rows.push({label: "Auxiliary", value: data.auxiliaries.join(", ")});
    }
    if (data.majlisNames?.length) {
      rows.push({label: "Majlis", value: data.majlisNames.join(", ")});
    }
    if (rows.length) return rows;
  }

  if (data.organisationType === "jamaat" && data.jamaatNames?.length) {
    return [{label: "Jamaat", value: data.jamaatNames.join(", ")}];
  }

  // Older bookings: use the saved text
  const text = data.jamaat || "N/A";
  return [{label: text.includes(" – ") ? "Booked For" : "Jamaat", value: text}];
};

// ---------- email templates ----------

const buildAdminHtml = (formData, bookingId) => {
  const datesListHtml = buildDatesHtml(getBookingDates(formData));

  const organisationRowsHtml = getOrganisationRows(formData)
      .map(
          (r) => `
          <tr class="detail-row">
            <td class="label">${esc(r.label)}</td>
            <td class="value">${esc(r.value)}</td>
          </tr>`,
      )
      .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; }
    .wrapper { width: 100%; background-color: #f4f7f9; padding-bottom: 40px; }
    .main { background-color: #ffffff; margin: 20px auto; max-width: 600px; border-radius: 12px; border: 1px solid #e0e6ed; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
    .hero-container { width: 100%; line-height: 0; }
    .hero-img { width: 100%; height: auto; display: block; border-top-left-radius: 12px; border-top-right-radius: 12px; }
    .progress-section { padding: 30px 40px 10px 40px; }
    .progress-track { background-color: #e0e6ed; height: 8px; border-radius: 10px; width: 100%; }
    .progress-fill { background-color: #00796b; height: 8px; border-radius: 10px; width: 50%; }
    .step-labels { width: 100%; margin-top: 10px; border-collapse: collapse; }
    .step-text { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999999; width: 33.33%; }
    .active-admin { color: #00796b; font-weight: bold; }
    .header { padding: 20px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f0f4f8; }
    .admin-badge { display: inline-block; background-color: #e0f2f1; color: #00796b; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; }
    .content { padding: 20px 40px; color: #333333; }
    .detail-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .detail-row td { border-bottom: 1px solid #f0f0f0; padding: 12px 0; font-size: 14px; vertical-align: top; }
    .label { color: #777777; text-align: left; width: 40%; }
    .value { color: #222222; font-weight: 600; text-align: right; }
    .btn-container { text-align: center; padding: 30px 0 10px; }
    .btn { background-color: #00796b; color: #ffffff !important; text-decoration: none; padding: 14px 30px; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 15px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999999; }
    h2 { color: #1a1a1a; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main">
      <div class="hero-container">
        <img src="${HERO_IMG}" alt="Bait us Salam" class="hero-img">
      </div>
      <div class="progress-section">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td><div class="progress-track"><div class="progress-fill"></div></div></td></tr>
        </table>
        <table class="step-labels">
          <tr>
            <td class="step-text active-admin" align="left">New Request</td>
            <td class="step-text" align="right">Finalized</td>
          </tr>
        </table>
      </div>
      <div class="header">
        <span class="admin-badge">Action Required</span>
        <h2>New Booking Request</h2>
        <p style="margin:0; font-size: 14px; color: #64748b;">Reference: #${esc(bookingId)}</p>
      </div>
      <div class="content">
        <p>Assalam o Alaikum,</p>
        <p>A new booking request has been submitted by <strong>${esc(formData.fullName)}</strong>.</p>
        <table class="detail-table">
          <tr class="detail-row">
            <td class="label">Event Name</td>
            <td class="value">${esc(formData.eventName)}</td>
          </tr>
          <tr class="detail-row">
            <td class="label">Locations</td>
            <td class="value">${esc((formData.locations || []).join(", "))}</td>
          </tr>
          <tr class="detail-row">
            <td class="label">Date(s)</td>
            <td class="value">${datesListHtml}</td>
          </tr>
          <tr class="detail-row">
            <td class="label">Time</td>
            <td class="value">${esc(formData.fromTime)} - ${esc(formData.toTime)}</td>
          </tr>
          <tr class="detail-row">
            <td class="label">Contact</td>
            <td class="value">${esc(formData.phoneNumber)}<br><small style="font-weight: normal;">${esc(formData.requestedByEmail || "No Email Provided")}</small></td>
          </tr>${organisationRowsHtml}
        </table>
        <div class="btn-container">
          <a href="${SITE_URL}/all-bookings?id=${encodeURIComponent(bookingId)}" class="btn">Review Booking</a>
        </div>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Bait us Salam Booking Portal<br>Internal Admin Notification</p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

const buildAcknowledgementHtml = (formData, bookingId) => {
  const datesListHtml = buildDatesHtml(getBookingDates(formData));

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; }
    .wrapper { width: 100%; background-color: #f4f7f9; padding-bottom: 40px; }
    .main { background-color: #ffffff; margin: 20px auto; max-width: 600px; border-radius: 12px; border: 1px solid #e0e6ed; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
    .hero-container { width: 100%; line-height: 0; }
    .hero-img { width: 100%; height: auto; display: block; border-top-left-radius: 12px; border-top-right-radius: 12px; }
    .progress-section { padding: 30px 40px 10px 40px; }
    .progress-track { background-color: #e0e6ed; height: 8px; border-radius: 10px; width: 100%; }
    .progress-fill { background-color: #1976d2; height: 8px; border-radius: 10px; width: 50%; }
    .step-labels { width: 100%; margin-top: 10px; border-collapse: collapse; }
    .step-text { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999999; width: 50%; }
    .active { color: #1976d2; font-weight: bold; }
    .header { padding: 20px 40px 10px; text-align: left; }
    .content { padding: 0 40px 20px; color: #333333; }
    .detail-table { width: 100%; border-collapse: collapse; margin-top: 25px; }
    .detail-row td { border-bottom: 1px solid #f0f0f0; padding: 12px 0; font-size: 14px; vertical-align: top; }
    .label { color: #777777; text-align: left; width: 30%; }
    .value { color: #222222; font-weight: 600; text-align: right; }
    .contact-box { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-top: 30px; border-left: 4px solid #1976d2; border: 1px solid #e0e6ed; border-left-width: 4px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999999; }
    h2 { color: #1a1a1a; margin: 0 0 5px 0; font-size: 22px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main">
      <div class="hero-container"><img src="${HERO_IMG}" alt="Bait us Salam" class="hero-img"></div>
      <div class="progress-section">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td><div class="progress-track"><div class="progress-fill"></div></div></td></tr>
        </table>
        <table class="step-labels">
          <tr><td class="step-text active" align="left">Received</td><td class="step-text" align="right">Finalised</td></tr>
        </table>
      </div>
      <div class="header">
        <h2 style="text-align:center; margin-bottom: 20px; color:#1976d2" >Booking Received</h2>
        <p style="margin:0; font-size: 15px; color: #555;">Assalam o Alaikum, <strong>${esc(formData.fullName)}</strong></p>
      </div>
      <div class="content">
        <p style="font-size: 15px; line-height: 1.6; margin-top: 10px;">We've received your request for <strong>${esc(formData.eventName)}</strong>. It will be reviewed shortly.</p>
        <table class="detail-table">
          <tr class="detail-row"><td class="label">Booking ID</td><td class="value">#${esc(bookingId)}</td></tr>
          <tr class="detail-row"><td class="label">Location(s)</td><td class="value">${esc((formData.locations || []).join(", "))}</td></tr>
          <tr class="detail-row"><td class="label">Date(s)</td><td class="value">${datesListHtml}</td></tr>
          <tr class="detail-row"><td class="label">Time</td><td class="value">${esc(formData.fromTime)} - ${esc(formData.toTime)}</td></tr>
        </table>
        <div class="contact-box">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #1976d2; text-transform: uppercase; font-size: 12px;">Need an update?</p>
          <div style="font-size: 14px; line-height: 1.6;">
            <strong>Mubarik Minhas:</strong> 0468 727 929<br>
            <strong>Ansar Shareef:</strong> 0426 714 215
          </div>
        </div>
      </div>
      <div class="footer"><p>This is an automated message. Please do not reply.</p></div>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Queue one email. The doc ID is deterministic and we use create(), so if the
 * function runs twice nobody gets a duplicate.
 */
const queueMail = async (mailId, to, message) => {
  try {
    await db.collection("mail").doc(mailId).create({to, message});
  } catch (err) {
    if (err.code === 6) return; // ALREADY_EXISTS: already queued
    throw err;
  }
};

// ---------- trigger ----------
// (Name kept from the first version so redeploying updates it in place.)
exports.notifyAdminsOfNewBooking = onDocumentCreated(
    {document: "bookings/{bookingId}", region: REGION},
    async (event) => {
      const snap = event.data;
      if (!snap) return;

      const booking = snap.data();
      const bookingId = booking.bookingId || event.params.bookingId;
      const tasks = []; // { label, promise }

      // ----- 1. Admin notification -----
      const adminsSnap = await db
          .collection("users")
          .where("role", "in", ["admin", "Admin"])
          .get();

      const adminEmails = [
        ...new Set(
            adminsSnap.docs
                .map((d) => String(d.data().email || d.id).toLowerCase())
                .filter(Boolean),
        ),
      ];

      if (adminEmails.length === 0) {
        logger.warn(
            `Booking ${bookingId}: no users with role "admin" found, no admin email queued.`,
        );
      } else {
        const adminMessage = {
          subject: `Action Required: Review Booking #${bookingId}`,
          html: buildAdminHtml(booking, bookingId),
        };
        // Safe to trust: the security rules force requestedByEmail to match
        // the signed-in user's own email.
        if (booking.requestedByEmail) {
          adminMessage.replyTo = booking.requestedByEmail;
        }

        adminEmails.forEach((email) => {
          tasks.push({
            label: "admin email",
            promise: queueMail(
                `admin-${bookingId}-${email.replace(/[^a-z0-9]/g, "_")}`,
                email,
                adminMessage,
            ),
          });
        });
      }

      // ----- 2. Acknowledgement to the person who booked -----
      const requesterEmail = String(booking.requestedByEmail || "").toLowerCase();
      if (requesterEmail) {
        tasks.push({
          label: "acknowledgement email",
          promise: queueMail(`user-${bookingId}`, requesterEmail, {
            subject: `Booking Request Received: ${bookingId} - ${booking.eventName}`,
            html: buildAcknowledgementHtml(booking, bookingId),
          }),
        });
      } else {
        logger.warn(
            `Booking ${bookingId}: no requestedByEmail, no acknowledgement queued.`,
        );
      }

      // ----- 3. Report -----
      const results = await Promise.allSettled(tasks.map((t) => t.promise));
      let failed = 0;
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          failed += 1;
          logger.error(
              `Booking ${bookingId}: failed to queue ${tasks[i].label}`,
              r.reason,
          );
        }
      });
      logger.info(
          `Booking ${bookingId}: queued ${tasks.length - failed} of ${tasks.length} emails.`,
      );
    },
);
