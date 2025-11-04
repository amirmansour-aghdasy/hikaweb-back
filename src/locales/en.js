export const enTranslations = {
    "auth": {
      "registerSuccess": "Registration completed successfully",
      "loginSuccess": "Login successful",
      "logoutSuccess": "Logout successful", 
      "tokenRequired": "Authentication token is required",
      "tokenInvalid": "Invalid token",
      "tokenExpired": "Token has expired",
      "tokenRefreshed": "Token refreshed successfully",
      "authenticationRequired": "Authentication required",
      "insufficientPermissions": "Insufficient permissions",
      "accessDenied": "Access denied",
      "userNotFound": "User not found",
      "passwordChanged": "Password changed successfully",
      "otpSent": "OTP code sent",
      "otpVerified": "OTP verified successfully"
    },
    "validation": {
      "failed": "Validation failed"
    },
    "common": {
      "internalError": "Internal server error",
      "notFound": "Not found",
      "invalidId": "Invalid ID",
      "duplicateEntry": "Duplicate entry", 
      "routeNotFound": "Route not found",
      "createSuccess": "Created successfully",
      "updateSuccess": "Updated successfully", 
      "deleteSuccess": "Deleted successfully",
      "retrieveSuccess": "Retrieved successfully"
    },
    "media": {
      "fileRequired": "File is required",
      "uploadSuccess": "File uploaded successfully",
      "updateSuccess": "Media information updated successfully",
      "deleteSuccess": "File deleted successfully",
      "notFound": "Media not found",
      "folderCreated": "Folder created successfully"
    },
    "users": {
      "createSuccess": "User created successfully",
      "updateSuccess": "User information updated",
      "deleteSuccess": "User deleted successfully", 
      "notFound": "User not found",
      "emailExists": "This email is already registered",
      "phoneNumberExists": "This Phone Number number is already registered"
    },
    "articles": {
      "createSuccess": "Article created successfully",
      "updateSuccess": "Article updated",
      "deleteSuccess": "Article deleted",
      "publishSuccess": "Article published",
      "unpublishSuccess": "Article unpublished", 
      "notFound": "Article not found",
      "slugExists": "This slug is already in use"
    },
    "services": {
      "createSuccess": "Service created successfully",
      "updateSuccess": "Service updated",
      "deleteSuccess": "Service deleted",
      "notFound": "Service not found",
      "slugExists": "This slug is already in use"
    },
    "portfolio": {
      "createSuccess": "Portfolio item created successfully", 
      "updateSuccess": "Portfolio item updated",
      "deleteSuccess": "Portfolio item deleted",
      "notFound": "Portfolio item not found"
    },
    "comments": {
      "createSuccess": "Comment submitted successfully",
      "updateSuccess": "Comment updated",
      "deleteSuccess": "Comment deleted",
      "moderateSuccess": "Comment moderated",
      "notFound": "Comment not found", 
      "alreadyCommented": "You have already commented"
    },
    "tickets": {
      "createSuccess": "Ticket created successfully",
      "updateSuccess": "Ticket updated",
      "closeSuccess": "Ticket closed",
      "assignSuccess": "Ticket assigned", 
      "messageAdded": "Message added to ticket",
      "notFound": "Ticket not found"
    },
    "consultations": {
      "submitSuccess": "Consultation request submitted",
      "updateSuccess": "Request updated",
      "notFound": "Request not found",
      "alreadyProcessed": "This request has already been processed"
    }
  };
  
  // Create the actual JSON file content for en.json
  const enJsonContent = JSON.stringify(enTranslations, null, 2);