import * as coda from "@codahq/packs-sdk";

export const pack = coda.newPack();

// Add network domain for Brevo API
pack.addNetworkDomain("api.brevo.com");

// ============================================================================
// FORMULAS (Actions)
// ============================================================================

/**
 * CreateEmailCampaign
 * Creates a new email campaign in Brevo using only mandatory fields.
 */
pack.addFormula({
  name: "CreateEmailCampaign",
  description: "Creates a new email campaign in Brevo using only mandatory fields.",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "api_key",
      description: "api_key.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "senderName",
      description: "Sender name.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "senderEmail",
      description: "Sender email address.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "campaignName",
      description: "Name of the campaign.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.Number,
      name: "templateId",
      description: "ID of the email template to use.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.Date,
      name: "scheduledAt",
      description: "Scheduled date and time for the campaign.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "subject",
      description: "Email subject.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.NumberArray,
      name: "listReceiverIds",
      description: "Array of contact list IDs to include.",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: coda.makeObjectSchema({
    properties: {
      id: { type: coda.ValueType.Number, required: true, description: "Campaign ID" },
    },
    displayProperty: "id",
  }),
  isAction: true,
  execute: async function ([api_key, senderName, senderEmail, campaignName, templateId, scheduledAt, subject, listReceiverIds], context) {
    let formattedDate: string;
    
    try {
      formattedDate = scheduledAt.toISOString();
      console.log("Original date in document timezone: " + scheduledAt.toLocaleString("en-US", { timeZone: context.timezone }));
      console.log("Formatted for API (UTC): " + formattedDate);
    } catch (e) {
      console.error("Date formatting error:", e);
      throw new Error("Invalid date format provided");
    }

    const payload = {
      sender: { name: senderName, email: senderEmail },
      name: campaignName,
      templateId: templateId,
      scheduledAt: formattedDate,
      subject: subject,
      toField: "{{contact.FIRSTNAME}} {{contact.LASTNAME}}",
      recipients: { listIds: listReceiverIds },
    };

    console.log("Creating email campaign with payload:", payload);

    const response = await context.fetcher.fetch({
      method: "POST",
      url: "https://api.brevo.com/v3/emailCampaigns",
      headers: {
        "Content-Type": "application/json",
        "api-key": api_key,
      },
      body: JSON.stringify(payload),
    });

    return response.body || {};
  },
});

/**
 * CreateContact
 * Creates a new contact in Brevo with name and email information.
 * If the contact already exists, it returns the existing contact info.
 */
pack.addFormula({
  name: "CreateContact",
  description: "Creates a new contact in Brevo with name and email information. If the contact already exists, it returns the existing contact info.",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "api_key",
      description: "Your Brevo API key.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "email",
      description: "Email address of the contact.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "firstName",
      description: "First name of the contact.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "lastName",
      description: "Last name of the contact.",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: coda.makeObjectSchema({
    properties: {
      id: { type: coda.ValueType.Number, required: true, description: "Contact ID" },
      email: { type: coda.ValueType.String, required: true, description: "Contact Email" },
      alreadyExists: { type: coda.ValueType.Boolean, description: "Whether the contact already existed" },
    },
    displayProperty: "email",
  }),
  isAction: true,
  execute: async function ([api_key, email, firstName, lastName], context) {
    // First, try to get the existing contact
    try {
      const getUrl = "https://api.brevo.com/v3/contacts/" + encodeURIComponent(email);
      const getResponse = await context.fetcher.fetch({
        method: "GET",
        url: getUrl,
        headers: { "api-key": api_key },
      });
      const existingContact = getResponse.body || {};
      return {
        id: existingContact.id || 0,
        email: email,
        alreadyExists: true,
      };
    } catch (e) {
      // Contact doesn't exist, create it
      const createResponse = await context.fetcher.fetch({
        method: "POST",
        url: "https://api.brevo.com/v3/contacts",
        headers: {
          "Content-Type": "application/json",
          "api-key": api_key,
        },
        body: JSON.stringify({
          email: email,
          attributes: { PRENOM: firstName, NOM: lastName },
        }),
      });
      const newContact = createResponse.body || {};
      return {
        id: newContact.id || 0,
        email: email,
        alreadyExists: false,
      };
    }
  },
});

/**
 * CreateList
 * Creates a new contact list in a specified folder in Brevo.
 */
pack.addFormula({
  name: "CreateList",
  description: "Creates a new contact list in a specified folder in Brevo.",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "api_key",
      description: "Your Brevo API key.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "name",
      description: "Name of the new list.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.Number,
      name: "folderId",
      description: "ID of the parent folder in which to create this list.",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: coda.makeObjectSchema({
    properties: {
      id: { type: coda.ValueType.Number, required: true, description: "ID of the newly created list" },
      name: { type: coda.ValueType.String, required: true, description: "Name of the list" },
    },
    displayProperty: "name",
  }),
  isAction: true,
  execute: async function ([api_key, name, folderId], context) {
    const response = await context.fetcher.fetch({
      method: "POST",
      url: "https://api.brevo.com/v3/contacts/lists",
      headers: {
        "Content-Type": "application/json",
        "api-key": api_key,
      },
      body: JSON.stringify({ name: name, folderId: folderId }),
    });
    return {
      id: (response.body || {}).id || 0,
      name: name,
    };
  },
});

/**
 * GetContactsFromList
 * Retrieves contacts from a specified list in Brevo.
 */
pack.addFormula({
  name: "GetContactsFromList",
  description: "Retrieves contacts from a specified list in Brevo.",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "api_key",
      description: "Your Brevo API key.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.Number,
      name: "listId",
      description: "ID of the contact list to retrieve contacts from.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "modifiedSince",
      description: "Filter contacts modified after a given UTC date-time (YYYY-MM-DDTHH:mm:ss.SSSZ).",
      optional: true,
    }),
    coda.makeParameter({
      type: coda.ParameterType.Number,
      name: "limit",
      description: "Number of contacts to return per page (max 500).",
      optional: true,
      suggestedValue: 50,
    }),
    coda.makeParameter({
      type: coda.ParameterType.Number,
      name: "offset",
      description: "Index of the first contact to return.",
      optional: true,
      suggestedValue: 0,
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "sort",
      description: "Sort order (asc or desc).",
      optional: true,
      suggestedValue: "desc",
    }),
  ],
  resultType: coda.ValueType.Array,
  items: coda.makeObjectSchema({
    properties: {
      id: { type: coda.ValueType.Number, required: true, description: "Contact ID" },
      email: { type: coda.ValueType.String, required: true, description: "Contact email" },
      emailBlacklisted: { type: coda.ValueType.Boolean, description: "Email blacklist status" },
      smsBlacklisted: { type: coda.ValueType.Boolean, description: "SMS blacklist status" },
      createdAt: { type: coda.ValueType.String, description: "Creation date-time" },
      modifiedAt: { type: coda.ValueType.String, description: "Last modification date-time" },
      firstName: { type: coda.ValueType.String, description: "First name" },
      lastName: { type: coda.ValueType.String, description: "Last name" },
    },
    displayProperty: "email",
    idProperty: "id",
  }),
  isAction: true,
  execute: async function ([api_key, listId, modifiedSince, limit, offset, sort], context) {
    const params: string[] = [];
    if (modifiedSince) params.push("modifiedSince=" + encodeURIComponent(modifiedSince));
    if (limit) params.push("limit=" + limit);
    if (offset !== undefined) params.push("offset=" + offset);
    if (sort) params.push("sort=" + sort);

    let url = `https://api.brevo.com/v3/contacts/lists/${listId}/contacts`;
    if (params.length > 0) {
      url += "?" + params.join("&");
    }

    const response = await context.fetcher.fetch({
      method: "GET",
      url: url,
      headers: { "api-key": api_key },
    });

    const contacts = (response.body || {}).contacts || [];
    return contacts.map((contact: any) => {
      const attributes = contact.attributes || {};
      return {
        id: contact.id,
        email: contact.email,
        emailBlacklisted: contact.emailBlacklisted,
        smsBlacklisted: contact.smsBlacklisted,
        createdAt: contact.createdAt,
        modifiedAt: contact.modifiedAt,
        firstName: attributes.FIRSTNAME || attributes.PRENOM || "",
        lastName: attributes.LASTNAME || attributes.NOM || "",
      };
    });
  },
});

/**
 * AddContactToList
 * Adds a contact to a specified list, creating the contact first if it doesn't exist.
 */
pack.addFormula({
  name: "AddContactToList",
  description: "Adds a contact to a specified list, creating the contact first if it doesn't exist.",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "api_key",
      description: "Your Brevo API key.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.Number,
      name: "listId",
      description: "ID of the list to add the contact to.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "email",
      description: "Email address of the contact to add.",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "firstName",
      description: "First name of the contact (used if contact needs to be created).",
      optional: true,
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "lastName",
      description: "Last name of the contact (used if contact needs to be created).",
      optional: true,
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: coda.makeObjectSchema({
    properties: {
      success: { type: coda.ValueType.Boolean, required: true, description: "Whether the operation was successful" },
      contactId: { type: coda.ValueType.Number, description: "ID of the contact" },
      email: { type: coda.ValueType.String, required: true, description: "Email of the contact" },
      contactCreated: { type: coda.ValueType.Boolean, description: "Whether a new contact was created" },
      addedToList: { type: coda.ValueType.Boolean, description: "Whether the contact was added to the list" },
      error: { type: coda.ValueType.String, description: "Error message if any" },
    },
    displayProperty: "email",
  }),
  isAction: true,
  execute: async function ([api_key, listId, email, firstName, lastName], context) {
    let contactId = 0;
    let contactCreated = false;

    // Try to get existing contact
    try {
      const getUrl = "https://api.brevo.com/v3/contacts/" + encodeURIComponent(email);
      const getResponse = await context.fetcher.fetch({
        method: "GET",
        url: getUrl,
        headers: { "api-key": api_key },
      });
      const existingContact = getResponse.body || {};
      contactId = existingContact.id || 0;
    } catch (e) {
      // Contact doesn't exist, create it
      try {
        const payload = {
          email: email,
          attributes: { PRENOM: firstName, NOM: lastName },
        };
        console.log("Creating contact with payload:", payload);
        
        const createResponse = await context.fetcher.fetch({
          method: "POST",
          url: "https://api.brevo.com/v3/contacts",
          headers: {
            "Content-Type": "application/json",
            "api-key": api_key,
          },
          body: JSON.stringify(payload),
        });
        const newContact = createResponse.body || {};
        contactId = newContact.id || 0;
        contactCreated = true;

        if (!contactId) {
          return {
            success: false,
            email: email,
            contactCreated: true,
            error: "Contact was created but no ID was returned",
          };
        }
      } catch (createError: any) {
        return {
          success: false,
          email: email,
          contactCreated: false,
          addedToList: false,
          error: "Failed to create contact: " + (createError.message || JSON.stringify(createError)),
        };
      }
    }

    // Add contact to list
    try {
      const addUrl = `https://api.brevo.com/v3/contacts/lists/${listId}/contacts/add`;
      const addPayload = { emails: [email] };

      await context.fetcher.fetch({
        method: "POST",
        url: addUrl,
        headers: {
          "Content-Type": "application/json",
          "api-key": api_key,
        },
        body: JSON.stringify(addPayload),
      });

      return {
        success: true,
        contactId: contactId,
        email: email,
        contactCreated: contactCreated,
        addedToList: true,
      };
    } catch (addError: any) {
      return {
        success: false,
        contactId: contactId,
        email: email,
        contactCreated: contactCreated,
        addedToList: false,
        error: "Failed to add contact to list: " + (addError.message || JSON.stringify(addError)),
      };
    }
  },
});

// ============================================================================
// SYNC TABLES
// ============================================================================

/**
 * ContactLists Sync Table
 * Syncs all contact lists from your Brevo account.
 */
pack.addSyncTable({
  name: "ContactLists",
  description: "Syncs all contact lists from your Brevo account.",
  identityName: "ContactList",
  schema: coda.makeObjectSchema({
    properties: {
      id: { type: coda.ValueType.Number, required: true, description: "ID of the list" },
      name: { type: coda.ValueType.String, required: true, description: "Name of the list" },
      totalBlacklisted: { type: coda.ValueType.Number, description: "Number of blacklisted contacts" },
      totalSubscribers: { type: coda.ValueType.Number, description: "Total contacts in the list" },
      uniqueSubscribers: { type: coda.ValueType.Number, description: "Number of unique contacts" },
      folderId: { type: coda.ValueType.Number, description: "ID of the folder containing the list" },
    },
    displayProperty: "name",
    idProperty: "id",
  }),
  formula: {
    name: "SyncContactLists",
    description: "Sync contact lists from Brevo",
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: "api_key",
        description: "Your Brevo API key.",
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: "limit",
        description: "Maximum number of lists to return per page (max 50).",
        optional: true,
        suggestedValue: 50,
      }),
    ],
    execute: async function ([api_key, limit], context) {
      const pageLimit = limit || 50;
      let results: any[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const url = `https://api.brevo.com/v3/contacts/lists?limit=${pageLimit}&offset=${offset}`;
        const response = await context.fetcher.fetch({
          method: "GET",
          url: url,
          headers: { "api-key": api_key },
        });
        const lists = (response.body || {}).lists || [];
        results = results.concat(lists);
        
        if (lists.length < pageLimit) {
          hasMore = false;
        } else {
          offset += pageLimit;
        }
        
        // Safety limit
        if (offset > 1000) {
          hasMore = false;
        }
      }

      return { result: results };
    },
  },
});

/**
 * Folders Sync Table
 * Syncs all contact folders from your Brevo account.
 */
pack.addSyncTable({
  name: "Folders",
  description: "Syncs all contact folders from your Brevo account.",
  identityName: "Folder",
  schema: coda.makeObjectSchema({
    properties: {
      id: { type: coda.ValueType.Number, required: true, description: "ID of the folder" },
      name: { type: coda.ValueType.String, required: true, description: "Name of the folder" },
      totalBlacklisted: { type: coda.ValueType.Number, description: "Number of blacklisted contacts in the folder" },
      totalSubscribers: { type: coda.ValueType.Number, description: "Total contacts in the folder" },
      uniqueSubscribers: { type: coda.ValueType.Number, description: "Number of unique contacts in the folder" },
    },
    displayProperty: "name",
    idProperty: "id",
  }),
  formula: {
    name: "SyncFolders",
    description: "Sync contact folders from Brevo",
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: "api_key",
        description: "Your Brevo API key.",
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: "limit",
        description: "Maximum number of folders to return per page (max 50).",
        optional: true,
        suggestedValue: 50,
      }),
    ],
    execute: async function ([api_key, limit], context) {
      const pageLimit = limit || 50;
      let results: any[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const url = `https://api.brevo.com/v3/contacts/folders?limit=${pageLimit}&offset=${offset}`;
        const response = await context.fetcher.fetch({
          method: "GET",
          url: url,
          headers: { "api-key": api_key },
        });
        const folders = (response.body || {}).folders || [];
        results = results.concat(folders);
        
        if (folders.length < pageLimit) {
          hasMore = false;
        } else {
          offset += pageLimit;
        }
        
        // Safety limit
        if (offset > 1000) {
          hasMore = false;
        }
      }

      return { result: results };
    },
  },
});

/**
 * EmailTemplates Sync Table
 * Syncs all email templates from your Brevo account.
 */
pack.addSyncTable({
  name: "EmailTemplates",
  description: "Syncs all email templates from your Brevo account.",
  identityName: "EmailTemplate",
  schema: coda.makeObjectSchema({
    properties: {
      id: { type: coda.ValueType.Number, required: true, description: "ID of the template" },
      name: { type: coda.ValueType.String, required: true, description: "Name of the template" },
      subject: { type: coda.ValueType.String, description: "Subject of the template" },
      isActive: { type: coda.ValueType.Boolean, description: "Status of template (true=active, false=inactive)" },
      testSent: { type: coda.ValueType.Boolean, description: "Status of test sending for the template" },
      senderName: { type: coda.ValueType.String, description: "Sender name" },
      senderEmail: { type: coda.ValueType.String, description: "Sender email" },
      replyTo: { type: coda.ValueType.String, description: "Reply to email" },
      toField: { type: coda.ValueType.String, description: "To field customization" },
      tag: { type: coda.ValueType.String, description: "Tag of the template" },
      htmlContent: { type: coda.ValueType.String, description: "HTML content of the template" },
      createdAt: { type: coda.ValueType.String, description: "Creation date-time" },
      modifiedAt: { type: coda.ValueType.String, description: "Last modification date-time" },
      doiTemplate: { type: coda.ValueType.Boolean, description: "Whether this is a Double opt-in template" },
    },
    displayProperty: "name",
    idProperty: "id",
  }),
  formula: {
    name: "SyncEmailTemplates",
    description: "Sync email templates from Brevo",
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: "api_key",
        description: "Your Brevo API key.",
      }),
      coda.makeParameter({
        type: coda.ParameterType.Boolean,
        name: "templateStatus",
        description: "Filter on the status of the template. Active = true, inactive = false.",
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: "limit",
        description: "Maximum number of templates to return per page (max 1000).",
        optional: true,
        suggestedValue: 50,
      }),
    ],
    execute: async function ([api_key, templateStatus, limit], context) {
      const pageLimit = limit || 50;
      let results: any[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const params: string[] = [];
        if (templateStatus !== undefined) {
          params.push("templateStatus=" + templateStatus);
        }
        params.push("limit=" + pageLimit);
        params.push("offset=" + offset);

        const url = "https://api.brevo.com/v3/smtp/templates?" + params.join("&");
        const response = await context.fetcher.fetch({
          method: "GET",
          url: url,
          headers: { "api-key": api_key },
        });
        const templates = (response.body || {}).templates || [];
        results = results.concat(templates);
        
        if (templates.length < pageLimit) {
          hasMore = false;
        } else {
          offset += pageLimit;
        }
        
        // Safety limit
        if (offset > 1000) {
          hasMore = false;
        }
      }

      return { result: results };
    },
  },
});
