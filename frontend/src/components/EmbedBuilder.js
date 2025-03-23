import React, { useState } from 'react';
import { Form, Button, Container, Card, Collapse } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/EmbedPreview.css';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { marked } from 'marked';

function DiscordEmbedBuilder() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#7289DA');
    const [fields, setFields] = useState([]);
    const [openFieldIndex, setOpenFieldIndex] = useState(null);

    const addField = () => {
        setFields([...fields, { name: '', value: '' }]);
        setOpenFieldIndex(fields.length);
    };

    const updateField = (index, updatedField) => {
        const updatedFields = fields.map((field, i) => i === index ? updatedField : field);
        setFields(updatedFields);
    };

    const removeField = (index) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const onDragEnd = (result) => {
        const { source, destination } = result;
        if (!destination) return;

        const reorderedFields = Array.from(fields);
        const [movedField] = reorderedFields.splice(source.index, 1);
        reorderedFields.splice(destination.index, 0, movedField);

        setFields(reorderedFields);
    };

    const generateEmbedJSON = () => {
        const embed = {
            title,
            description,
            color: parseInt(color.replace('#', ''), 16),
            fields,
        };
        return JSON.stringify(embed, null, 2);
    };

    const renderMarkdown = (text) => {
        return { __html: marked(text) };
    };

    return (
        <Container className="mt-4">
            <h1 className="text-center">Discord Embed Builder</h1>
            <Form>
                <Form.Group controlId="formTitle">
                    <Form.Label>Title</Form.Label>
                    <Form.Control
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="dark-input"
                    />
                </Form.Group>
                <Form.Group controlId="formDescription">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="dark-input"
                    />
                </Form.Group>
                <Form.Group controlId="formColor">
                    <Form.Label>Colour</Form.Label>
                    <Form.Control
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="dark-input"
                    />
                </Form.Group>

                {/* Add Field Button */}
                <Button variant="primary" onClick={addField} className="mt-3">
                    Add Field
                </Button>
            </Form>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="droppable">
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                            {fields.map((field, index) => (
                                <Draggable key={index} draggableId={`field-${index}`} index={index}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className="mb-2"
                                        >
                                            <Card>
                                                <Card.Header className="d-flex align-items-center">
                                                    <div {...provided.dragHandleProps} className="draggable-handle">
                                                        ☰
                                                    </div>
                                                    <Button
                                                        variant="link"
                                                        onClick={() => setOpenFieldIndex(openFieldIndex === index ? null : index)}
                                                        className="float-end me-2 collapse-btn"
                                                    >
                                                        {openFieldIndex === index ? (
                                                            <i className="bi bi-caret-up-fill"></i>
                                                        ) : (
                                                            <i className="bi bi-caret-down-fill"></i>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        onClick={() => removeField(index)}
                                                        className="float-end me-2 remove-btn"
                                                    >
                                                        Remove
                                                    </Button>
                                                </Card.Header>
                                                <Collapse in={openFieldIndex === index}>
                                                    <Card.Body>
                                                        <Form.Group controlId={`formFieldName${index}`}>
                                                            <Form.Label>Field Name</Form.Label>
                                                            <Form.Control
                                                                type="text"
                                                                value={field.name}
                                                                onChange={(e) => updateField(index, { ...field, name: e.target.value })}
                                                                className="dark-input"
                                                            />
                                                        </Form.Group>
                                                        <Form.Group controlId={`formFieldValue${index}`}>
                                                            <Form.Label>Field Value</Form.Label>
                                                            <Form.Control
                                                                as="textarea"
                                                                rows={4}
                                                                value={field.value}
                                                                onChange={(e) => updateField(index, { ...field, value: e.target.value })}
                                                                className="dark-input"
                                                            />
                                                        </Form.Group>
                                                    </Card.Body>
                                                </Collapse>
                                            </Card>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <h3 className='mt-4 fs-4 fw-normal'>Preview</h3>
            <div className="embed-preview">
                <div className="embed-container" style={{ borderLeft: `10px solid ${color}` }}>
                    <div className="embed-content">
                        <div className="embed-title">{title}</div>
                        <div className="embed-description" dangerouslySetInnerHTML={renderMarkdown(description)} />
                        {fields.map((field, index) => (
                            <div className="embed-field" key={index}>
                                <div className="embed-field-name">{field.name}</div>
                                <div className="embed-field-value" dangerouslySetInnerHTML={renderMarkdown(field.value)} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Card className="mt-4 dark-card">
                <Card.Header>Generated JSON</Card.Header>
                <Card.Body>
                    <pre>{generateEmbedJSON()}</pre>
                    <Button
                        variant="secondary"
                        onClick={() => navigator.clipboard.writeText(generateEmbedJSON())}
                    >
                        Copy JSON to Clipboard
                    </Button>
                </Card.Body>
            </Card>
        </Container>
    );
}

export default DiscordEmbedBuilder;
