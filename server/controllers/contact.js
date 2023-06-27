const Contact = require("../models/contact");
const mongoose = require("mongoose");

exports.getContact = async (req, res) => {
  try {
    const contact = await Contact.find({});
    res.json(contact);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.postContact = async (req, res) => {
  try {
    const contact = new Contact(req.body);
    await contact.save();
    await res.json(contact);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.getContactById = async (req, res) => {
  try {
    const id = req.params.id;

    // Check if the provided id is a valid ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    // Check if the contactId exists
    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    res.json(contact);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.updateContactById = async (req, res) => {
  try {
    const id = req.params.id;

    // Check if the provided id is a valid ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    // Check if the contactId exists
    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    // if contactId exists, update the contact
    const updatedContact = await Contact.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );
    res.json(updatedContact);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.deleteContactById = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the contactId exists
    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    // if contactId exists, delete the contact
    const deletedContact = await Contact.findByIdAndRemove(id);
    res.json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};
