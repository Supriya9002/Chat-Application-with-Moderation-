const PROFANITY_WORDS = [
  "fuck",
  "shit",
  "damn",
  "bitch",
  "asshole",
  "bastard",
  // Add more words as needed
];

const SPAM_PATTERNS = [
  /(.)\1{4,}/, // Repeated characters
  /[A-Z]{5,}/, // Excessive caps
  /(.{1,10})\1{3,}/, // Repeated patterns
];

export const moderateContent = (content) => {
  const result = {
    original: content,
    filtered: content,
    flagged: false,
    reason: null,
  };

  // Check for profanity
  const lowerContent = content.toLowerCase();
  let hasProfanity = false;

  PROFANITY_WORDS.forEach((word) => {
    if (lowerContent.includes(word)) {
      hasProfanity = true;
      const regex = new RegExp(word, "gi");
      result.filtered = result.filtered.replace(regex, "*".repeat(word.length));
    }
  });

  if (hasProfanity) {
    result.flagged = true;
    result.reason = "profanity";
  }

  // Check for spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      result.flagged = true;
      result.reason = result.reason ? `${result.reason}, spam` : "spam";
      break;
    }
  }

  // Check message length for potential spam
  if (content.length > 500) {
    result.flagged = true;
    result.reason = result.reason
      ? `${result.reason}, long_message`
      : "long_message";
  }

  return result;
};

export const calculateSpamScore = (user, recentMessages) => {
  let score = 0;

  // Check message frequency
  const now = new Date();
  const recentCount = recentMessages.filter(
    (msg) =>
      msg.user_id.toString() === user._id.toString() &&
      now - msg.created_at < 60000 // Last minute
  ).length;

  if (recentCount > 10) score += 50;
  else if (recentCount > 5) score += 25;

  // Check for repeated content
  const lastMessages = recentMessages.slice(-5);
  const duplicates = lastMessages.filter(
    (msg) => msg.user_id.toString() === user._id.toString()
  );

  if (duplicates.length >= 3) {
    const contents = duplicates.map((msg) => msg.content);
    const unique = new Set(contents);
    if (unique.size < contents.length * 0.5) {
      score += 30;
    }
  }

  return score;
};
