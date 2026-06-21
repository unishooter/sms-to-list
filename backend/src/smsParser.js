/**
 * Parses inbound SMS messages into { itemName, listName, displayListName }.
 *
 * Supported formats:
 *   "add eggs to heb"
 *   "eggs to heb"
 *   "add milk costco"        <- no "to", last token is the store
 *   "milk costco"
 */
function parseMessage(body) {
  if (!body || typeof body !== 'string') {
    return { success: false, error: 'Empty message' };
  }

  let text = body.trim();

  // Strip optional leading "add" keyword (case-insensitive)
  text = text.replace(/^add\s+/i, '').trim();

  // Look for " to " separator (last occurrence wins for phrases like "add sauce to pasta to heb")
  const toIndex = text.toLowerCase().lastIndexOf(' to ');

  let rawItem, rawList;

  if (toIndex !== -1) {
    rawItem = text.slice(0, toIndex).trim();
    rawList = text.slice(toIndex + 4).trim();
  } else {
    // No "to" keyword — treat last whitespace-delimited token as the list name.
    // If there's only one token, use it as the item; the webhook will route to "unspecified".
    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      rawItem = text;
      rawList = '__unspecified__'; // sentinel; webhook replaces with "unspecified"
    } else {
      rawList = parts[parts.length - 1];
      rawItem = parts.slice(0, parts.length - 1).join(' ');
    }
  }

  // Normalize whitespace
  rawItem = rawItem.replace(/\s+/g, ' ').trim();
  rawList = rawList.replace(/\s+/g, ' ').trim();

  if (!rawItem || !rawList) {
    return { success: false, error: 'Item name or list name is empty after parsing' };
  }

  return {
    success: true,
    itemName: toTitleCase(rawItem),
    listName: rawList.toLowerCase(),       // stored key
    displayListName: toTitleCase(rawList), // UI label
    hadToKeyword: toIndex !== -1,
  };
}

function toTitleCase(str) {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

module.exports = { parseMessage };
