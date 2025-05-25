export class RBACLibrary {
  static validPermissions = ['view', 'edit', 'download', 'admin'];

  static validatePermission(permissionLevel) {
    if (!this.validPermissions.includes(permissionLevel)) {
      return {
        isValid: false,
        error: `Invalid permission level. Must be one of: ${this.validPermissions.join(', ')}`
      };
    }
    return { isValid: true };
  }
  static assignPermissions(documentId, userId, permissionLevel, existingAcl = []) {
    // Validate permission level
    const validation = this.validatePermission(permissionLevel);
    if (!validation.isValid) {
      return { 
        success: false, 
        error: validation.error,
        acl: existingAcl
      };
    }

    // Check if this exact permission already exists
    const existingEntry = existingAcl.find(
      entry => entry.documentId === documentId && 
               entry.userId === userId && 
               entry.permissionLevel === permissionLevel
    );

    // If it exists, remove it (toggle off)
    if (existingEntry) {
      const updatedAcl = existingAcl.filter(
        entry => !(entry.documentId === documentId && 
                  entry.userId === userId && 
                  entry.permissionLevel === permissionLevel)
      );
      return {
        success: true,
        documentId,
        userId,
        permissionLevel,
        acl: updatedAcl,
        removed: true,
        updatedAt: new Date().toISOString()
      };
    }

    // Otherwise, add new permission (toggle on)
    const newAclEntry = {
      documentId,
      userId,
      permissionLevel,
      assignedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    // Add new entry to ACL, removing any existing permissions for this user
    const filteredAcl = existingAcl.filter(
      entry => !(entry.documentId === documentId && entry.userId === userId)
    );
    const updatedAcl = [...filteredAcl, newAclEntry];
    return {
      success: true,
      documentId,
      userId,
      permissionLevel,
      acl: updatedAcl,
      assignedAt: newAclEntry.assignedAt
    };
  }

  static removePermissions(documentId, userId, existingAcl = []) {
    const updatedAcl = existingAcl.filter(
      entry => !(entry.documentId === documentId && entry.userId === userId)
    );

    return {
      success: true,
      documentId,
      userId,
      acl: updatedAcl,
      removedAt: new Date().toISOString()
    };
  }

  static getPermissions(documentId, userId, existingAcl = []) {
    const entry = existingAcl.find(
      entry => entry.documentId === documentId && entry.userId === userId
    );

    return {
      success: true,
      documentId,
      userId,
      permissionLevel: entry ? entry.permissionLevel : null,
      hasAccess: !!entry
    };
  }

  static hasPermission(documentId, userId, requiredPermission, existingAcl = []) {
    const permissionHierarchy = {
      'view': 0,
      'download': 1,
      'edit': 2,
      'admin': 3
    };

    const entry = existingAcl.find(
      entry => entry.documentId === documentId && entry.userId === userId
    );

    if (!entry) {
      return {
        success: true,
        hasPermission: false,
        currentPermission: null
      };
    }

    const requiredLevel = permissionHierarchy[requiredPermission];
    const currentLevel = permissionHierarchy[entry.permissionLevel];

    return {
      success: true,
      hasPermission: currentLevel >= requiredLevel,
      currentPermission: entry.permissionLevel
    };
  }

  static getAllUsersWithAccess(documentId, existingAcl = []) {
    const documentAcl = existingAcl.filter(entry => entry.documentId === documentId);

    return {
      success: true,
      documentId,
      users: documentAcl.map(entry => ({
        userId: entry.userId,
        permissionLevel: entry.permissionLevel,
        assignedAt: entry.assignedAt
      }))
    };
  }
}
