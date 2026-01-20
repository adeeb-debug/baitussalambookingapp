import { collection, addDoc, writeBatch, doc, query, where, getDocs } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

export const sendAdminNotification = async (db, formData) => {
  try {
    // Get all users who are admins
    const adminsQuery = query(
      collection(db, "users"),
      where("isAdmin", "==", true)
    );
    const adminsSnapshot = await getDocs(adminsQuery);

    const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email);

    if (adminEmails.length === 0) {
      return;
    }

    // Send email to each admin
    const mailPromises = adminEmails.map(email =>
      addDoc(collection(db, "mail"), {
        to: email,
        message: {
          subject: `NEW BOOKING: ${formData.eventName}`,
          replyTo: formData.email,
          html: `
           <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
  <!-- Header -->
  <div style="background-color: #00796b; padding: 20px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 22px;">📝 New Booking Request</h1>
  </div>

  <!-- Body -->
  <div style="padding: 20px; line-height: 1.6; color: #333;">
    <p>Assalam o Alaikum,</p>
    <p>A new booking request has been submitted. Details are below:</p>

    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <tr>
        <td style="padding: 8px; font-weight: bold; width: 120px;">Organizer:</td>
        <td style="padding: 8px;">${formData.fullName}</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 8px; font-weight: bold;">Email:</td>
        <td style="padding: 8px;">${formData.email}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">Event:</td>
        <td style="padding: 8px;">${formData.eventName}</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 8px; font-weight: bold;">Locations:</td>
        <td style="padding: 8px;">${formData.locations.join(", ")}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">Date:</td>
        <td style="padding: 8px;">${formData.date}</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 8px; font-weight: bold;">Time:</td>
        <td style="padding: 8px;">${formData.timeRange}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">Phone:</td>
        <td style="padding: 8px;">${formData.phoneNumber || "N/A"}</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 8px; font-weight: bold;">Jamaat:</td>
        <td style="padding: 8px;">${formData.jamaat || "N/A"}</td>
      </tr>
    </table>

    <p style="margin-top: 20px;">
      Please review the booking and take necessary action.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin-top: 25px;">
      <a href="https://booking-baitussalam.web.app/" 
         style="background-color: #00796b; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; display: inline-block; font-weight: bold;">
        Review Booking
      </a>
    </div>

    <p style="margin-top: 20px; font-size: 0.85rem; color: #777;">
      This is an automated notification. Please do not reply directly to this email.
    </p>
  </div>
</div>
`,
        },
      })
    );

    await Promise.all(mailPromises);
    
  } catch (error) {
  }
};

// 2. NOTIFY USER (Triggered by Admin when decisions are finished)
export const sendUserConfirmation = async (db, group) => {
  // Generate the HTML list of statuses for the email
  const locationListHtml = group.bookings
    .map(
      (b) => `
    <li style="margin-bottom: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px; list-style: none;">
      <strong style="color: #333;">${b.location}:</strong> 
      <span style="color: ${b.status === "Approved" ? "#2e7d32" : "#d32f2f"}; font-weight: bold; text-transform: uppercase; font-size: 0.85rem;">
        ${b.status}
      </span>
      ${b.rejectionReason ? `<br/><small style="color: #666; font-style: italic;">Note: ${b.rejectionReason}</small>` : ""}
    </li>`
    )
    .join("");

  try {
    // A. Add to Mail Collection
    await addDoc(collection(db, "mail"), {
      to: group.requestedBy,
      message: {
        subject: `Update: Your Booking for ${group.eventName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1976d2; padding: 20px; text-align: center; color: white;">
              <h2 style="margin:0;">Booking Decision</h2>
            </div>
            <div style="padding: 20px; line-height: 1.6;">
              <p>Assalam o Alaikum <strong>${group.requestedByName}</strong>,</p>
              <p>The admin has finished reviewing your request for <strong>${group.eventName}</strong>.</p>
              <div style="margin: 20px 0;">
                ${locationListHtml}
              </div>
             <p>For any questions regarding your booking, please contact:</p>
              <ul>
                <li>Sadar Jamaat Langwarrin - Mubarik Minhas: 0468 727 929</li>
                <li>Naib Sadar Jamaat Langwarrin - Ansar Shareef: 0426 714 215</li>
              </ul>

                            <p style="font-size: 0.8rem; color: #888; border-top: 1px solid #eee; padding-top: 10px;">
                This is an automated acknowledgment. Please do not reply to this email.
              </p>
            </div>
          </div>`,
      },
    });

    // B. Mark as "Notified" in the database so we don't send it twice
    const batch = writeBatch(db);
    group.bookings.forEach((b) => {
      const ref = doc(db, "bookings", b.id);
      batch.update(ref, { userNotified: true, notifiedAt: new Date().toISOString() });
    });
    await batch.commit();

  } catch (error) {
    throw error;
  }
};

// 3. INITIAL SUBMISSION (The Batch Create)
export const submitBookingBatch = async (db, user, formData, locations) => {
  const batch = writeBatch(db);
  const groupId = uuidv4();

  for (const locationName of locations) {
    
    const customId = `${formData.date}_${formData.eventName.replace(/\s+/g, '')}_${locationName.replace(/\s+/g, '')}`;
    const newDocRef = doc(db, "bookings",customId);
    batch.set(newDocRef, {
      ...formData,
      location: locationName,
      status: "Pending",
      userNotified: false, // Track if decision email has been sent
      requestedBy: user.email,
      requestedByName: formData.fullName,
      requestedAt: new Date().toISOString(),
      groupId: groupId,
    });
  }
  await batch.commit();
  return { groupId };
};

// 4. USER ACKNOWLEDGMENT EMAIL (Immediate upon booking submission)
export const sendUserAcknowledgement = async (db, userEmail, userName, formData) => {
  try {
    await addDoc(collection(db, "mail"), {
      to: userEmail,
      message: {
        subject: `Booking Request Received: ${formData.eventName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1976d2; padding: 20px; text-align: center; color: white;">
              <h2 style="margin:0;">Booking Request Acknowledged</h2>
            </div>
            <div style="padding: 20px; line-height: 1.6;">
              <p>Assalam o Alaikum <strong>${userName}</strong>,</p>
              <p>Your booking request for <strong>${formData.eventName}</strong> </strong> has been successfully received.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr>
        <td style="padding: 8px; font-weight: bold;">Event:</td>
        <td style="padding: 8px;">${formData.eventName}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold; width: 120px;">Organizer:</td>
        <td style="padding: 8px;">${formData.fullName}</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 8px; font-weight: bold;">Email:</td>
        <td style="padding: 8px;">${userEmail}</td>
      </tr>

      <tr style="background-color: #f9f9f9;">
        <td style="padding: 8px; font-weight: bold;">Locations:</td>
        <td style="padding: 8px;">${formData.locations.join(", ")}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">Date:</td>
        <td style="padding: 8px;">${formData.date}</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 8px; font-weight: bold;">Time:</td>
        <td style="padding: 8px;">${formData.fromTime} - ${formData.toTime}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">Phone:</td>
        <td style="padding: 8px;">${formData.phoneNumber || "N/A"}</td>
      </tr>
      <tr style="background-color: #f9f9f9;">
        <td style="padding: 8px; font-weight: bold;">Jamaat:</td>
        <td style="padding: 8px;">${formData.jamaat || "N/A"}</td>
      </tr>
    </table>
              
              
              <p>Please wait for the approval to be granted. You will receive a confirmation once it has been approved or rejected.</p>
              <p>If you do not hear back within <strong>2 days</strong>, please contact:</p>
              <ul>
                <li>Sadar Jamaat Langwarrin - Mubarik Minhas: 0468 727 929</li>
                <li>Naib Sadar Jamaat Langwarrin - Ansar Shareef: 0426 714 215</li>
              </ul>
              <p style="font-size: 0.8rem; color: #888; border-top: 1px solid #eee; padding-top: 10px;">
                This is an automated acknowledgment. Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      },
    });


  } catch (error) {
    throw error;
  }
};
