# Visitor information (leads) and conversation reset

Two optional widget features, configured per chatbot:

- a **form that asks visitors for their details** (name, e-mail, phone, company, up to 3 custom questions);
- a **button that lets visitors start the conversation over**.

## Ask visitors for their details

Open a chatbot, then the **Leads** tab. Turn on *Ask visitors for their details* and configure:

| Setting | Description |
|---|---|
| **When** | *Before the conversation starts*: the form replaces the chat until it is filled. *Inside the conversation, after N visitor messages* (1 to 10): the chat is free at first and a form card appears in the conversation once the visitor has written N messages. |
| **Title, introduction, button text, thank-you message** | The texts of the form. |
| **Fields** | Name, E-mail, Phone number, Company, or up to 3 **custom questions** (text, e-mail or phone). 6 fields at most. Each field has its own label and a *Required* switch. Use the arrows to reorder. |
| **Consent text** | Optional. When set, the visitor must tick a box with this text before sending. Recommended when you collect personal data. |
| **Let visitors skip the form** | Adds a *Skip* link so the form never blocks the chat. |

A **live preview** on the right shows exactly what visitors will see. Submitting the form in the preview sends nothing.

### What happens when a visitor submits

1. The browser sends the values to `POST /api/v1/leads` (see the [API reference](api-reference.md#post-apiv1leads)).
2. The server **validates everything against the chatbot's own form**: unknown fields are dropped, required fields must be present, e-mails and phone numbers must look valid, lengths are capped, control characters are removed, and the consent box must be ticked when a consent text is configured. The browser is never trusted.
3. The contact is saved: **one contact per conversation** (sending again updates it).
4. If a **name** field was filled, the chatbot greets the visitor by name: the name is added to the prompt for that visitor only. Answers that may contain a name are **never cached**, so one visitor's name can never be shown to another.
5. The visitor does not see the form again during the same browser tab session.

### Viewing, exporting and deleting contacts

The *Collected contacts* list of the Leads tab shows each contact with its date, values, consent and the website it came from.

- **Conversation** opens the messages of that visitor.
- **Export CSV** downloads every contact (UTF-8 with BOM, opens correctly in Excel). Cells that a spreadsheet could read as a formula are neutralised with an apostrophe, so visitor-typed text cannot become a formula.
- **Delete** erases one contact; **Delete all** erases all of them.
- The dashboard shows the number of contacts collected in the selected period.

### Privacy and legal notes

Names, e-mails and phone numbers are personal data. You are the data controller:

- Tell visitors why you ask and what you do with the data. Use the **consent text** and link your privacy policy in it or in the introduction.
- Keep contacts only as long as needed, and delete them on request (*Delete*).
- Contacts are stored only in **your own database**. They are not sent to any AI provider, except the **first name or name the visitor typed**, which is added to that visitor's prompt so the chatbot can greet them. If that is a problem for you, do not add the *Name* field, or use a provider you trust.
- Back up and protect your database like any file containing personal data (see [security.md](security.md)).

### From the API

The public chat endpoint accepts an optional `visitor` object so your own interface can personalise answers too:

```json
{ "message": "Hello", "visitor": { "name": "Marie" } }
```

## The reset button

In **Appearance**, tick *Show a button to start a new conversation*. A round-arrow button appears in the widget header.

- It asks for confirmation inside the chat ("Start a new conversation? Cancel / Reset").
- On confirmation the messages and history are cleared, the welcome message and suggested questions come back, and a **new conversation id** is used, so the old and new conversations are separate in your logs.
- If the visitor already gave their details, they are **attached to the new conversation without asking again**.
- The button does nothing before the first message, and is disabled while an answer is being written.
- It is off by default.
