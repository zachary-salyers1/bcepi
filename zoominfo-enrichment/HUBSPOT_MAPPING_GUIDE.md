# HubSpot Field Mapping Guide - ZoomInfo Enrichment

## Make.com Setup: Update HubSpot Contact with ZoomInfo Data

### Step 1: Add HubSpot Module After HTTP Request

In Make.com, after your HTTP module (ZoomInfo API call):
1. Click the **+** button
2. Search for **HubSpot**
3. Select **Update a Contact**

---

## Step 2: Field Mappings

### **Basic Contact Information**

| HubSpot Property | Map to ZoomInfo Field | Example |
|------------------|----------------------|---------|
| **Record ID** | `{{previous.hubspotContactId}}` or use the ID from step 8 | `177661339700` |
| **First Name** | `{{http.data.data.firstName}}` | `Jason` |
| **Last Name** | `{{http.data.data.lastName}}` | `Markel` |
| **Email** | `{{http.data.data.email}}` | Keep existing or update if found |
| **Phone Number** | `{{http.data.data.phone}}` | Direct work phone |
| **Mobile Phone Number** | `{{http.data.data.mobilePhone}}` | Mobile phone |

### **Job & Company Information**

| HubSpot Property | Map to ZoomInfo Field | Example |
|------------------|----------------------|---------|
| **Job Title** | `{{http.data.data.jobTitle}}` | `Sales Representative` |
| **Company Name** | `{{http.data.data.company.name}}` | `Forest City Technologies` |
| **Company Domain Name** | `{{http.data.data.company.website}}` | Company website |
| **Company Phone** | `{{http.data.data.company.phone}}` | Main company number |
| **Department** | `{{http.data.data.department}}` | Sales, Marketing, etc. |
| **Management Level** | `{{http.data.data.managementLevel}}` | VP, Director, Manager, etc. |

### **Location Information**

| HubSpot Property | Map to ZoomInfo Field | Example |
|------------------|----------------------|---------|
| **City** | `{{http.data.data.location.city}}` | Contact's city |
| **State/Region** | `{{http.data.data.location.state}}` | Contact's state |
| **Country** | `{{http.data.data.location.country}}` | Contact's country |

### **ZoomInfo Metadata (Create Custom Properties)**

| HubSpot Custom Property | Map to ZoomInfo Field | Purpose |
|-------------------------|----------------------|---------|
| **ZoomInfo ID** | `{{http.data.zoomInfoId}}` | Unique ZoomInfo identifier |
| **ZoomInfo Confidence Score** | `{{http.data.confidenceScore}}` | Data accuracy (70-99) |
| **ZoomInfo Last Updated** | `{{http.data.metadata.lastUpdatedDate}}` | When ZoomInfo last verified |
| **ZoomInfo Enriched Date** | `{{http.data.metadata.enrichedAt}}` | When we enriched this contact |
| **Has Email** | `{{http.data.metadata.hasEmail}}` | true/false |
| **Has Direct Phone** | `{{http.data.metadata.hasDirectPhone}}` | true/false |
| **Has Mobile Phone** | `{{http.data.metadata.hasMobilePhone}}` | true/false |

---

## Step 3: Create Custom Properties in HubSpot (First Time Setup)

Go to HubSpot Settings → Properties → Contact Properties

### Create These Custom Properties:

1. **ZoomInfo ID**
   - Field Type: `Single-line text`
   - Internal Name: `zoominfo_id`

2. **ZoomInfo Confidence Score**
   - Field Type: `Number`
   - Internal Name: `zoominfo_confidence_score`

3. **ZoomInfo Last Updated**
   - Field Type: `Date picker`
   - Internal Name: `zoominfo_last_updated`

4. **ZoomInfo Enriched Date**
   - Field Type: `Date picker`
   - Internal Name: `zoominfo_enriched_date`

5. **ZoomInfo Data Available**
   - Field Type: `Multiple checkboxes`
   - Options: `Email`, `Direct Phone`, `Mobile Phone`
   - Internal Name: `zoominfo_data_available`

---

## Step 4: Handle Missing Data (Important!)

### Use Make.com's `if()` function for conditional mapping:

Some fields might be empty. Use this pattern:

```
{{if(exists(http.data.data.firstName); http.data.data.firstName; emptystring)}}
```

This means: "If firstName exists, use it, otherwise leave empty"

### Example Mappings with Conditionals:

**Job Title:**
```
{{if(exists(http.data.data.jobTitle); http.data.data.jobTitle; emptystring)}}
```

**Phone:**
```
{{if(exists(http.data.data.phone); http.data.data.phone; emptystring)}}
```

**Company Name:**
```
{{if(exists(http.data.data.company.name); http.data.data.company.name; emptystring)}}
```

---

## Step 5: Set Update Behavior

In the HubSpot Update module:

**Update existing values?**
- ✅ **Yes, overwrite** - If you want ZoomInfo to always update (recommended for enrichment)
- ❌ **No, skip if has value** - If you want to preserve existing HubSpot data

**Recommended:** Set to **"Only update empty properties"** so you don't overwrite manually entered data.

---

## Step 6: Add Error Handling

### Handle 404 (Contact Not Found in ZoomInfo)

Add a **Router** after the HTTP module:

**Route 1: Success (Status 200)**
- Filter: `{{http.statusCode}}` equals `200`
- Action: Update HubSpot with enriched data

**Route 2: Not Found (Status 404)**
- Filter: `{{http.statusCode}}` equals `404`
- Action: Update HubSpot with note:
  - Add to Contact Activity: "ZoomInfo enrichment attempted but contact not found in database"
  - Or set custom field: `ZoomInfo Status = "Not Found"`

**Route 3: Error (Other Status)**
- Filter: `{{http.statusCode}}` does not equal `200`
- Action: Log error or send notification

---

## Complete Make.com Flow

```
1. HubSpot Trigger (New/Updated Contact)
   ↓
2. Router (Split based on email type)
   ↓
   Path A: Business Email
   ↓
3. HTTP Module (Call ZoomInfo API)
   ↓
4. Router (Handle response)
   ↓
   ├─ Success (200) → Update HubSpot with enriched data
   ├─ Not Found (404) → Add note "Contact not in ZoomInfo"
   └─ Error → Log error
```

---

## Example Make.com Configuration

### HubSpot Update Module Settings:

**Connection:** Your HubSpot account

**Record ID:**
```
{{8.id}}
```
(or whatever step your HubSpot trigger is)

**Properties to Update:**

| Property | Value |
|----------|-------|
| firstname | `{{http.data.data.firstName}}` |
| lastname | `{{http.data.data.lastName}}` |
| jobtitle | `{{http.data.data.jobTitle}}` |
| company | `{{http.data.data.company.name}}` |
| phone | `{{http.data.data.phone}}` |
| mobilephone | `{{http.data.data.mobilePhone}}` |
| city | `{{http.data.data.location.city}}` |
| state | `{{http.data.data.location.state}}` |
| country | `{{http.data.data.location.country}}` |
| zoominfo_id | `{{http.data.zoomInfoId}}` |
| zoominfo_confidence_score | `{{http.data.confidenceScore}}` |

---

## Testing Your Setup

### Test with a Contact That:

1. ✅ **Has business email** → Should enrich successfully
2. ❌ **Has personal email** → Should handle 404 gracefully
3. ✅ **Has partial data** → Should fill in the blanks

### Check HubSpot After:

1. Go to the contact record
2. Verify fields were updated
3. Check activity timeline for enrichment note
4. Verify custom ZoomInfo properties are populated

---

## Pro Tips

### 1. **Only Update Empty Fields**
Set HubSpot module to "Only update if empty" to preserve manually entered data

### 2. **Add Last Enriched Timestamp**
Always update a "Last Enriched" date so you know when data was pulled

### 3. **Track Enrichment Status**
Create a dropdown: `Enrichment Status`
- Options: `Enriched`, `Not Found`, `Error`, `Pending`

### 4. **Re-enrich Periodically**
Set up a scheduled scenario to re-enrich contacts every 90 days (data gets stale)

### 5. **Don't Overwrite Good Data**
If HubSpot has a value and ZoomInfo doesn't, keep the HubSpot value

---

## Troubleshooting

**Fields not updating?**
- Check property internal names in HubSpot
- Verify the path to the data (use Make.com's mapping picker)
- Check if properties are editable (not calculated properties)

**Getting errors?**
- Verify HubSpot connection is active
- Check contact record ID is valid
- Ensure custom properties exist in HubSpot

**Data looks wrong?**
- Check the HTTP module output to see what ZoomInfo actually returned
- Verify confidence score is high (>85)
- Compare with ZoomInfo portal to confirm accuracy

---

## Need Help?

If you run into issues:
1. Check the HTTP module output in Make.com
2. Verify the HubSpot property names
3. Test with a known-good contact first
4. Check Make.com execution logs for errors
