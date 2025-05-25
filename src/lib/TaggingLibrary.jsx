export class TaggingLibrary {
  static normalizeTag(tag) {
    return tag.trim().toLowerCase();
  }

  static addTags(documentId, newTags, existingTags = []) {
    // Normalize and validate each new tag
    const normalizedNewTags = newTags
      .map(tag => this.normalizeTag(tag))
      .filter(tag => tag.length > 0);

    // Validate new tags
    const validation = this.validateTags(normalizedNewTags);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors[0],
        tags: existingTags
      };
    }

    // Check for duplicates considering case-insensitive comparison
    const existingLowerCase = new Set(existingTags.map(tag => tag.toLowerCase()));
    const uniqueNewTags = normalizedNewTags.filter(tag => !existingLowerCase.has(tag));

    // Combine existing tags with unique new tags
    const updatedTags = [...existingTags, ...uniqueNewTags];

    return {
      documentId,
      tags: updatedTags,
      updatedAt: new Date().toISOString(),
      success: true
    };
  }
  
  static removeTags(documentId, tagsToRemove, existingTags = []) {
    // Normalize tags to remove
    const normalizedTagsToRemove = new Set(
      tagsToRemove.map(tag => this.normalizeTag(tag))
    );

    // Filter out removed tags (case-insensitive)
    const remainingTags = existingTags.filter(
      tag => !normalizedTagsToRemove.has(tag.toLowerCase())
    );

    return {
      documentId,
      tags: remainingTags,
      updatedAt: new Date().toISOString(),
      success: true
    };
  }

  static editTag(documentId, oldTag, newTag, existingTags = []) {
    const normalizedOldTag = this.normalizeTag(oldTag);
    const normalizedNewTag = this.normalizeTag(newTag);

    // Validate the new tag
    const validation = this.validateTags([normalizedNewTag]);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors[0],
        tags: existingTags
      };
    }

    // Check if new tag already exists (excluding the old tag being edited)
    if (existingTags.some(tag => 
      tag.toLowerCase() === normalizedNewTag && 
      tag.toLowerCase() !== normalizedOldTag)) {
      return {
        success: false,
        error: 'Tag already exists',
        tags: existingTags
      };
    }

    // Replace the old tag with the new one (case-sensitive update)
    const updatedTags = existingTags.map(tag => 
      tag.toLowerCase() === normalizedOldTag ? normalizedNewTag : tag
    );

    return {
      documentId,
      tags: updatedTags,
      updatedAt: new Date().toISOString(),
      success: true
    };
  }

  static validateTags(tags) {
    const errors = [];
    const validTags = [];
    const seen = new Set();

    for (const tag of tags) {
      const normalizedTag = this.normalizeTag(tag);
      
      // Empty tag check
      if (!normalizedTag) {
        errors.push('Empty tags are not allowed');
        continue;
      }

      // Length checks
      if (normalizedTag.length < 2) {
        errors.push(`Tag "${tag}" is too short (minimum 2 characters)`);
        continue;
      }
      
      if (normalizedTag.length > 30) {
        errors.push(`Tag "${tag}" is too long (maximum 30 characters)`);
        continue;
      }

      // Format check (alphanumeric and hyphens/underscores only)
      if (!/^[a-z0-9-_]+$/.test(normalizedTag)) {
        errors.push(`Tag "${tag}" can only contain letters, numbers, hyphens, and underscores`);
        continue;
      }

      // Duplicate check within new tags
      if (seen.has(normalizedTag)) {
        errors.push(`Duplicate tag "${tag}"`);
        continue;
      }

      seen.add(normalizedTag);
      validTags.push(normalizedTag);
    }

    return {
      isValid: errors.length === 0,
      errors,
      validTags
    };
  }
}
