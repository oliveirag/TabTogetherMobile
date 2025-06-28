import React, { useState, useEffect } from 'react';

// Main App component for the Bill Splitter
const App = () => {
    // State variables for managing application data
    const [imageFile, setImageFile] = useState(null); // Stores the uploaded image file
    const [base64Image, setBase64Image] = useState(''); // Stores the base64 encoded image
    const [loading, setLoading] = useState(false); // Indicates if API call is in progress
    const [extractedItems, setExtractedItems] = useState([]); // Stores items extracted by Gemini
    const [taxRate, setTaxRate] = useState(''); // Tax rate input
    const [tipInput, setTipInput] = useState(''); // Tip input value (percentage or fixed amount)
    const [tipType, setTipType] = useState('percentage'); // Tip type: 'percentage' or 'amount'
    const [people, setPeople] = useState([{ id: 1, name: 'Person 1', selectedItems: [] }]); // List of people and their selected items
    const [errorMessage, setErrorMessage] = useState(''); // For displaying error messages

    // Handle image file selection
    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setImageFile(file);
            setErrorMessage(''); // Clear previous errors
            const reader = new FileReader();
            reader.onloadend = () => {
                // Convert image to base64 string
                setBase64Image(reader.result.split(',')[1]);
            };
            reader.readAsDataURL(file);
        } else {
            setImageFile(null);
            setBase64Image('');
            setExtractedItems([]);
            setErrorMessage('Please select an image file.');
        }
    };

    // Call Gemini API to extract items and prices from the image
    const extractItemsFromImage = async () => {
        if (!base64Image) {
            setErrorMessage('Please upload an image first.');
            return;
        }

        setLoading(true);
        setErrorMessage('');
        setExtractedItems([]); // Clear previous items
        setTaxRate(''); // Clear previous tax rate before new extraction

        // Define the prompt for the Gemini API to extract items, subtotal, and tax
        const prompt = `
            Analyze this image of a receipt or bill.
            Extract all individual line items with their names and prices.
            Also, identify the subtotal amount (before tax and tip) and the total tax amount as explicitly listed on the bill.
            Structure the output as a JSON object with the following properties:
            - 'items': An array of objects, where each object has 'item' (string) and 'price' (number).
            - 'subtotalAmountOnBill': The numeric value of the subtotal listed on the bill.
            - 'taxAmountOnBill': The numeric value of the total tax listed on the bill.
            If any of these values are not found, use 0 or an empty array as appropriate.
            Example: {
                "items": [{"item": "Burger", "price": 12.99}, {"item": "Fries", "price": 4.50}],
                "subtotalAmountOnBill": 17.49,
                "taxAmountOnBill": 1.50
            }
        `;

        try {
            // Prepare the payload for the Gemini API call
            const payload = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: imageFile.type,
                                    data: base64Image
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            "items": {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        "item": { "type": "STRING" },
                                        "price": { "type": "NUMBER" }
                                    },
                                    required: ["item", "price"]
                                }
                            },
                            "subtotalAmountOnBill": { "type": "NUMBER" },
                            "taxAmountOnBill": { "type": "NUMBER" }
                        },
                        required: ["items", "subtotalAmountOnBill", "taxAmountOnBill"],
                        propertyOrdering: ["items", "subtotalAmountOnBill", "taxAmountOnBill"]
                    }
                }
            };

            const apiKey = ""; // API key will be provided by the Canvas environment
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            // Make the fetch call to the Gemini API
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${response.status} - ${errorData.error.message || 'Unknown error'}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const jsonText = result.candidates[0].content.parts[0].text;
                try {
                    const parsedResult = JSON.parse(jsonText);

                    // Set extracted items
                    const validItems = (parsedResult.items || []).filter(item => item.item && typeof item.price === 'number' && item.price > 0);
                    setExtractedItems(validItems);
                    if (validItems.length === 0) {
                        setErrorMessage("No valid items and prices could be extracted. Please try another image or enter items manually.");
                    }

                    // Attempt to auto-fill tax rate
                    const subtotalOnBill = parsedResult.subtotalAmountOnBill;
                    const taxOnBill = parsedResult.taxAmountOnBill;

                    if (typeof taxOnBill === 'number' && typeof subtotalOnBill === 'number' && subtotalOnBill > 0) {
                        const calculatedTaxRate = (taxOnBill / subtotalOnBill) * 100; // Convert to percentage
                        setTaxRate(calculatedTaxRate.toFixed(2)); // Set as string for input field
                        console.log(`Auto-detected tax rate: ${calculatedTaxRate.toFixed(2)}%`);
                    } else {
                        console.log("Could not auto-detect tax amount or subtotal from bill.");
                        setTaxRate(''); // Clear if not found or invalid
                    }

                } catch (parseError) {
                    setErrorMessage(`Failed to parse Gemini response: ${parseError.message}. Response was: ${jsonText}`);
                }
            } else {
                setErrorMessage('Gemini did not return any content. Please try again.');
            }
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            setErrorMessage(`Error processing image: ${error.message}. Please ensure the image is clear and contains a bill.`);
        } finally {
            setLoading(false);
        }
    };

    // Add a new person to the bill
    const addPerson = () => {
        setPeople([...people, { id: people.length + 1, name: `Person ${people.length + 1}`, selectedItems: [] }]);
    };

    // Remove a person from the bill
    const removePerson = (idToRemove) => {
        setPeople(people.filter(person => person.id !== idToRemove));
    };

    // Handle name change for a person
    const handlePersonNameChange = (id, newName) => {
        setPeople(people.map(person =>
            person.id === id ? { ...person, name: newName } : person
        ));
    };

    // Handle item selection for a person
    const handleItemSelection = (personId, itemIndex, isChecked) => {
        setPeople(prevPeople => {
            return prevPeople.map(person => {
                if (person.id === personId) {
                    const newSelectedItems = isChecked
                        ? [...person.selectedItems, itemIndex]
                        : person.selectedItems.filter(index => index !== itemIndex);
                    return { ...person, selectedItems: newSelectedItems };
                }
                return person;
            });
        });
    };

    // --- CALCULATION LOGIC ---

    // Calculate total subtotal from all extracted items
    const totalSubtotal = extractedItems.reduce((sum, item) => sum + item.price, 0);

    // Calculate tax amount
    const taxAmount = totalSubtotal * (parseFloat(taxRate || 0) / 100);

    // Calculate tip amount based on selected type (percentage or fixed amount)
    const tipValue = parseFloat(tipInput) || 0;
    const tipAmount = tipType === 'percentage'
        ? totalSubtotal * (tipValue / 100)
        : tipValue;

    // Calculate grand total
    const grandTotal = totalSubtotal + taxAmount + tipAmount;

    // Calculate individual shares
    const calculateIndividualShares = () => {
        return people.map(person => {
            const personSubtotal = person.selectedItems.reduce((sum, itemIndex) =>
                sum + extractedItems[itemIndex].price, 0
            );

            let personTaxShare = 0;
            let personTipShare = 0;

            // Distribute tax and tip proportionally based on each person's subtotal share
            if (totalSubtotal > 0) {
                const proportion = personSubtotal / totalSubtotal;
                personTaxShare = taxAmount * proportion;
                personTipShare = tipAmount * proportion;
            }

            const totalOwed = personSubtotal + personTaxShare + personTipShare;

            return {
                ...person,
                subtotal: personSubtotal,
                taxShare: personTaxShare,
                tipShare: personTipShare,
                totalOwed: totalOwed,
            };
        });
    };

    const individualShares = calculateIndividualShares();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-4 sm:p-8 flex items-center justify-center font-sans">
            <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-4xl w-full">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-800 mb-8">💰 Smart Bill Splitter 💰</h1>

                {/* Image Upload Section */}
                <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow-inner">
                    <h2 className="text-xl sm:text-2xl font-semibold text-blue-800 mb-4 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        Upload Bill Image
                    </h2>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-700
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-500 file:text-white
                                hover:file:bg-blue-600"
                    />
                    {imageFile && (
                        <div className="mt-4 text-center">
                            <img src={URL.createObjectURL(imageFile)} alt="Uploaded Bill" className="max-h-64 mx-auto rounded-lg border border-gray-300 shadow-md"/>
                        </div>
                    )}
                    <button
                        onClick={extractItemsFromImage}
                        disabled={!base64Image || loading}
                        className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full
                                 shadow-lg transition duration-300 ease-in-out transform hover:scale-105
                                 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>}
                        {loading ? 'Extracting Items...' : 'Extract Items from Bill'}
                    </button>
                    {errorMessage && <p className="text-red-600 text-center mt-4 text-sm">{errorMessage}</p>}
                </div>

                {/* Extracted Items Section */}
                {extractedItems.length > 0 && (
                    <div className="mb-8 p-6 bg-green-50 rounded-lg shadow-inner">
                        <h2 className="text-xl sm:text-2xl font-semibold text-green-800 mb-4 flex items-center">
                            <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                            Extracted Items
                        </h2>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2">
                            {extractedItems.map((item, index) => (
                                <li key={index} className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm border border-gray-200">
                                    <span className="text-gray-700 font-medium">{item.item}</span>
                                    <span className="text-gray-900 font-bold">${item.price.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* People and Item Selection Section */}
                {extractedItems.length > 0 && (
                    <div className="mb-8 p-6 bg-yellow-50 rounded-lg shadow-inner">
                        <h2 className="text-xl sm:text-2xl font-semibold text-yellow-800 mb-4 flex items-center">
                            <svg className="w-6 h-6 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20v-4h-4a1 1 0 00-1 1v3M10 9H7a1 1 0 00-1 1v4h4M4 4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2H4z"></path></svg>
                            Who Got What?
                        </h2>
                        {people.map(person => (
                            <div key={person.id} className="bg-white p-4 mb-4 rounded-lg shadow-md border border-yellow-200">
                                <div className="flex items-center justify-between mb-3">
                                    <input
                                        type="text"
                                        value={person.name}
                                        onChange={(e) => handlePersonNameChange(person.id, e.target.value)}
                                        className="text-lg font-bold text-gray-800 p-2 border border-gray-300 rounded-md flex-grow mr-2"
                                        placeholder="Enter Person's Name"
                                    />
                                    {people.length > 1 && (
                                        <button
                                            onClick={() => removePerson(person.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out text-sm"
                                            title="Remove this person"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                    {extractedItems.map((item, itemIndex) => (
                                        <label key={itemIndex} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={person.selectedItems.includes(itemIndex)}
                                                onChange={(e) => handleItemSelection(person.id, itemIndex, e.target.checked)}
                                                className="form-checkbox h-5 w-5 text-indigo-600 rounded-md focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-700">{item.item} (${item.price.toFixed(2)})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={addPerson}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full
                                     shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mt-4"
                            title="Add a new person to split the bill with"
                        >
                            Add Another Person
                        </button>
                    </div>
                )}

                {/* Tax & Tip Input Section */}
                <div className="mb-8 p-6 bg-purple-50 rounded-lg shadow-inner">
                    <h2 className="text-xl sm:text-2xl font-semibold text-purple-800 mb-4 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 6v-2m0 6v2"></path></svg>
                        Tax & Tip
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="tax" className="block text-gray-700 text-sm font-bold mb-2">Tax Rate (%)</label>
                            <input
                                type="number"
                                id="tax"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-indigo-500"
                                placeholder="e.g., 8.25"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label htmlFor="tip" className="block text-gray-700 text-sm font-bold mb-2">Tip</label>
                            <div className="flex items-center">
                                <div className="relative w-full">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                        {tipType === 'percentage' ? '%' : '$'}
                                    </div>
                                    <input
                                        type="number"
                                        id="tip"
                                        value={tipInput}
                                        onChange={(e) => setTipInput(e.target.value)}
                                        className="shadow appearance-none border rounded-l-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-indigo-500 pl-7"
                                        placeholder={tipType === 'percentage' ? "e.g., 15" : "e.g., 10.00"}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="flex shadow-sm">
                                    <button
                                        onClick={() => { setTipType('percentage'); setTipInput(''); }}
                                        className={`px-4 py-2 font-semibold text-sm transition-colors duration-200 ${tipType === 'percentage' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                        aria-label="Set tip type to percentage"
                                    >
                                        %
                                    </button>
                                    <button
                                        onClick={() => { setTipType('amount'); setTipInput(''); }}
                                        className={`px-4 py-2 font-semibold text-sm transition-colors duration-200 rounded-r-lg ${tipType === 'amount' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                        aria-label="Set tip type to fixed amount"
                                    >
                                        $
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="p-6 bg-gray-100 rounded-lg shadow-xl">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Bill Summary
                    </h2>
                    <div className="flex justify-between items-center text-lg font-medium text-gray-700 mb-2">
                        <span>Total Subtotal:</span>
                        <span>${totalSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-medium text-gray-700 mb-2">
                        <span>Tax ({parseFloat(taxRate || 0).toFixed(2)}%):</span>
                        <span>${taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-medium text-gray-700 mb-4">
                        <span>
                           {tipType === 'percentage'
                               ? `Tip (${tipValue.toFixed(2)}%):`
                               : 'Tip:'
                           }
                        </span>
                        <span>${tipAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-bold text-gray-900 border-t-2 border-dashed border-gray-300 pt-4">
                        <span>Grand Total:</span>
                        <span>${grandTotal.toFixed(2)}</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mt-8 mb-4 border-b pb-2">Individual Breakdowns</h3>
                    {individualShares.map(person => (
                        <div key={person.id} className="bg-white p-4 mb-3 rounded-lg shadow-sm border border-gray-200">
                            <h4 className="text-lg sm:text-xl font-semibold text-indigo-700 mb-2">{person.name}</h4>
                            <ul className="text-gray-600 text-sm mb-2">
                                {person.selectedItems.length > 0 ? (
                                    person.selectedItems.map(itemIndex => (
                                        <li key={itemIndex}>- {extractedItems[itemIndex].item}: ${extractedItems[itemIndex].price.toFixed(2)}</li>
                                    ))
                                ) : (
                                    <li>No items selected</li>
                                )}
                            </ul>
                            <div className="text-md font-medium text-gray-700">
                                <p>Subtotal: ${person.subtotal.toFixed(2)}</p>
                                <p>Tax Share: ${person.taxShare.toFixed(2)}</p>
                                <p>Tip Share: ${person.tipShare.toFixed(2)}</p>
                                <p className="text-lg font-bold text-green-700 mt-1">Total Owed: ${person.totalOwed.toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default App;
