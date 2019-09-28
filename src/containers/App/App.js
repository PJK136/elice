import React, {Component} from 'react';
import './App.css';

import Columns from '../../components/Columns/Columns';
import Courses from '../../components/Courses/Courses';
import Summary from '../../components/Summary/Summary';
import Affectations from '../../components/Affectations/Affectations';
import Statistics from '../../components/Statistics/Statistics';
import dataHandler from '../../services/dataHandler';
import reactTableUtil from '../../services/reactTableUtil';
import MunkresApp from '../../lib/munkrespp';

import CSVReader from 'react-csv-reader';
import Container from 'react-bootstrap/Container';
import Jumbotron from 'react-bootstrap/Jumbotron';
import {Col, Row} from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import fileDownload from 'js-file-download';
import seedRandom from 'seedrandom';

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array

function shuffleArray(array, seed) {
    let rng = seedRandom(seed);
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function shuffleArray2(array1, array2, seed) {
    if (array1.length !== array2.length) {
        throw Error("array1.length !== array2.length")
    }

    let rng = seedRandom(seed);

    for (let i = array1.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [array1[i], array1[j]] = [array1[j], array1[i]];
        [array2[i], array2[j]] = [array2[j], array2[i]];
    }
}

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            wishCount: 0,
            columns: new Map(),
            courses: new Map(),
            students: [],
            rtColumns: [{dataField: 'id', text: 'Vide'}],
            seed: "seed",
            statistics: null,
            isAffecting: false,
            errorShown: false,
            errorMessage: ""
        };
    }

    loadData(data, filename, meta) {
        data = dataHandler.preProcess(data);
        let columns = dataHandler.extractColumns(meta);
        let wishCount = 0;
        for (let name of columns.keys()) {
            if (columns.get(name).state === "wish") {
                wishCount++;
            }
        }

        let courses = dataHandler.updatedCourses(new Map(), data, columns);
        let rtColumns = reactTableUtil.columnParser(columns, courses);

        this.setState({
            wishCount: wishCount,
            columns: columns,
            courses: courses,
            students: data,
            rtColumns: rtColumns,
            statistics: null
        });
    }

    handleDataError(e) {
        console.log(e);
    }

    deletedWishNum(state, key) {
        // Not even a wish column ! Nothing to be done
        if (state.columns.get(key).wishNum === -1) {
            return state;
        }

        state = {...state};
        state.column = new Map(state.column);

        // Update the current wish columns count
        state.wishCount--;

        // Shift other wish columns' numbers
        for (let el of state.columns.keys()) {
            if (state.columns.get(el).wishNum > state.columns.get(key).wishNum)
                state.columns.set(el, {...state.columns.get(el), wishNum: state.columns.get(el).wishNum - 1});
        }

        // Delete the column's wish number
        state.columns.set(key, {...state.columns.get(key), wishNum: -1});

        return state;
    }

    changeColumnMode(e) {
        let value = e.target.value;
        let key = e.target.id;
        let state = {...this.state};
        state.columns = new Map(state.columns);

        if (value !== "wish") {
            state = this.deletedWishNum(state, key);
        } else if (state.columns.get(key).wishNum === -1) {
            state.wishCount++;
            state.columns.set(key, {...state.columns.get(key), wishNum: state.wishCount});
        }

        if (value !== "appeal") {
            state.columns.set(key, {...state.columns.get(key), appealNum: -1});
        }

        state.columns.set(key, {...state.columns.get(key), state: value});
        state.courses = dataHandler.updatedCourses(state.courses, state.students, state.columns);
        state.rtColumns = reactTableUtil.columnParser(state.columns, state.courses);
        this.setState(state);
    }

    changeColumnWishNum(e) {
        let value = parseInt(e.target.value);
        let key = e.target.id;
        let state = {...this.state};

        if (value === -1) {
            state = this.deletedWishNum(state, key);
        } else {
            if (state.columns.get(key).wishNum === -1) {
                state.wishCount++;
                state.columns.set(key, {...state.columns.get(key), wishNum: state.wishCount});
            }

            for (let el of state.columns.keys()) {
                if (state.columns.get(el).wishNum === value) {
                    state.columns.set(el, {...state.columns.get(el), wishNum: state.columns.get(key).wishNum});
                    break;
                }
            }
        }

        state.columns.set(key, {...state.columns.get(key), wishNum: value});
        state.courses = dataHandler.updatedCourses(state.courses, state.students, state.columns);
        state.rtColumns = reactTableUtil.columnParser(state.columns, state.courses);
        this.setState(state);
    }

    changeColumnAppealNum(e) {
        let value = e.target.value;
        let key = e.target.id;
        let state = {...this.state};

        if (value !== -1) {
            for (let el of state.columns.keys()) {
                if (state.columns.get(el).appealNum === value) {
                    state.columns.set(el, {...state.columns.get(el), appealNum: state.columns.get(key).appealNum});
                    break;
                }
            }
        }

        state.columns.set(key, {...state.columns.get(key), appealNum: value});
        state.courses = dataHandler.updatedCourses(state.courses, state.students, state.columns);
        state.rtColumns = reactTableUtil.columnParser(state.columns, state.courses);
        this.setState(state);
    }

    changePlaces(e) {
        let name = e.target.form.id;
        let type = e.target.name;
        let value = e.target.value;

        if (value < 0)
            return;

        let courses = new Map(this.state.courses);
        let course = courses.get(name);

        switch (type) {
            case "min":
                courses.set(name, {...course, minPlaces: Math.min(value, course.maxPlaces)});
                break;
            case "max":
                courses.set(name, {...course,
                                   maxPlaces: Math.max(Math.max(course.reservedPlaces + this.countManualAffectation(name), course.minPlaces), value)});
                break;
            case "reserved":
                courses.set(name, {...course, reservedPlaces: Math.min(value, course.maxPlaces)});
                break;
            default:
                throw Error("unexpected case");
        }

        this.setState({courses: courses});
    }

    changeSeed(e) {
        let name = e.target.name;
        let value = e.target.value;

        if (name === "seed")
            this.setState({seed: value});
        else if (name === "random_seed")
            this.setState({seed: Math.random().toString(36).substring(2)});
    }

    getStudentsWishMatrix() {
        let courseIds = {};

        let id = 0;
        for (let name of this.state.courses.keys()) {
            courseIds[name] = id++;
        }

        let students = this.state.students;

        let wishMatrix = [];
        for (let studentId in students) {
            let wishList = [];
            wishList.studentId = studentId;
            for (let col in students[studentId]) {
                if (this.state.columns.get(col) !== undefined && this.state.columns.get(col).wishNum !== -1) {
                    let limeSurveyCourseName = students[studentId][col];
                    let limeSurveyCourseRank = this.state.columns.get(col).wishNum;
                    let limeSurveyCourseId = courseIds[limeSurveyCourseName];
                    wishList[limeSurveyCourseId] = limeSurveyCourseRank;
                }
            }

            wishMatrix[studentId] = wishList;
        }

        return wishMatrix;
    }

    getStudentsInterestMatrix() {
        let courseIds = {};

        let id = 0;
        for (let name of this.state.courses.keys()) {
            courseIds[name] = id++;
        }

        let students = this.state.students;

        let interestMatrix = [];
        for (let studentId in students) {
            let interestList = [];
            interestList.studentId = studentId;
            for (let col in students[studentId]) {
                if (this.state.columns.get(col)!== undefined && this.state.columns.get(col).appealNum !== -1) {
                    let limeSurveyInterest = students[studentId][col].toLowerCase();
                    let course = this.state.columns.get(col).appealNum;
                    let courseId = courseIds[course];
                    let interest = 0;

                    if (limeSurveyInterest.includes("pas du tout")) {
                        interest = -2;
                    } else if (limeSurveyInterest.includes("peu")) {
                        interest = -1;
                    } else if (limeSurveyInterest.includes("très")) {
                        interest = 2;
                    } else {
                        interest = 1;
                    }

                    interestList[courseId] = interest;
                }
            }

            interestMatrix[studentId] = interestList;
        }

        return interestMatrix;
    }

    countManualAffectation(courseName) {
        let count = 0;
        for (let studentId in this.state.students) {
            if (this.state.students[studentId].affectationMode === courseName)
                count++;
        }

        return count;
    }

    getTotalManualAffectations() {
        let count = 0;
        for(let i = 0; i < this.state.students.length; ++i){
            if (this.state.students[i].affectationMode !== "Automatique")
                count++;
        }
        return count;
    }

    getTotalMinPlaces() {
        return Array.from(this.state.courses.values()).reduce((acc, course) => acc + course.minPlaces, 0);
    }

    getAutoMinPlaces() {
        return Array.from(this.state.courses.keys()).reduce(
            (acc, name) => {
                let course = this.state.courses.get(name);
                return acc + Math.max(0, course.minPlaces - course.reservedPlaces - this.countManualAffectation(name))
            }, 0);
    }

    getTotalMaxPlaces() {
        return Array.from(this.state.courses.values()).reduce((acc, course) => acc + course.maxPlaces, 0);
    }

    getAutoMaxPlaces() {
        return Array.from(this.state.courses.keys()).reduce(
            (acc, name) => {
                let course = this.state.courses.get(name);
                return acc + Math.max(0, course.maxPlaces - course.reservedPlaces - this.countManualAffectation(name))
            }, 0);
    }

    getTotalReservedPlaces() {
        return Array.from(this.state.courses.values()).reduce((acc, course) => acc + course.reservedPlaces, 0);
    }

    getCourseUnreservedMinPlaces() {
        let places = [];
        let courseId = 0;
        for (let [, course] of this.state.courses) {
            places[courseId++] = Math.max(0, course.minPlaces - course.reservedPlaces);
        }

        return places;
    }

    getCourseUnreservedMaxPlaces() {
        let places = [];
        let courseId = 0;
        for (let [, course] of this.state.courses) {
            places[courseId++] = Math.max(0, course.maxPlaces - course.reservedPlaces);
        }

        return places;
    }

    computePenalties(size) {
        let penalties = [];
        for (let i = 0; i < size; i++)
            penalties[i] = 10*i*i;
        return penalties;
    }

    affect(useAppeal) {
        let manualStudentCount = this.getTotalManualAffectations();
        let autoStudentCount = this.state.students.length - manualStudentCount;
        if (this.getAutoMinPlaces() > autoStudentCount)
            this.showError("Il n'y a pas assez d'étudiants pour remplir toutes les places minimales en affectation automatique.");
        else if (autoStudentCount > this.getAutoMaxPlaces())
            this.showError("Il n'y a pas assez de places au maximum pour tous les étudiants en affectation automatique.");
        else {
            let wishCount = 0;
            for (let name of this.state.columns.keys()) {
                let col = this.state.columns.get(name);
                if (col.state === "wish") {
                    wishCount++;
                    if (col.wishNum === -1) {
                        this.showError("Il faut associer toutes les colonnes des voeux à l'ordre correspondant !");
                        return;
                    }
                }
            }

            if (wishCount !== this.state.courses.size) {
                this.showError("Il faut autant de colonnes de vœux que de modules !");
                return;
            }

            if (useAppeal) {
                let appealCount = 0;
                for (let name of this.state.columns.keys()) {
                    let col = this.state.columns.get(name);
                    if (col.state === "appeal") {
                        appealCount++;
                        if (col.appealNum === -1) {
                            this.showError("Il faut associer toutes les colonnes des attraits au module correspondant !");
                            return;
                        }
                    }
                }

                if (appealCount !== this.state.courses.size) {
                    this.showError("Il manque les colonnes d'attrait pour certains cours !");
                    return;
                }
            }
            let students = [...this.state.students];

            // On efface les affectations précédentes
            for (let studentId in students) {
                students[studentId] = {...students[studentId], result: "Calcul en cours"};
            }

            this.setState({students: students, isAffecting: true});
            setTimeout(() => this._affect(useAppeal), 0);
        }
    }

    _affect(useAppeal) {
        // wishMatrix et interestMatrix ont pour clé le studentId
        // tandis que wishMatrixAuto et interestMatrixAuto ont pour clés des ids randomisés

        let wishMatrix = this.getStudentsWishMatrix();
        let minPlaces = this.getCourseUnreservedMinPlaces();
        let maxPlaces = this.getCourseUnreservedMaxPlaces();
        let penalties = this.computePenalties(this.state.courses.size);
        let interestMatrix = undefined;

        // On enlève les étudiants qui sont affectés manuellement et on mélange la matrice
        let wishMatrixAuto = wishMatrix.filter(listMatrix => this.state.students[listMatrix.studentId].affectationMode === "Automatique");
        let interestMatrixAuto = undefined;
        if (useAppeal) {
            interestMatrix = this.getStudentsInterestMatrix();
            interestMatrixAuto = interestMatrix.filter(listMatrix => this.state.students[listMatrix.studentId].affectationMode === "Automatique");
            shuffleArray2(wishMatrixAuto, interestMatrixAuto, this.state.seed);
        } else {
            shuffleArray(wishMatrixAuto, this.state.seed);
        }

        let courseNames = Array.from(this.state.courses.keys());

        // On décompte les étudiants qui sont affectés manuellement
        let autoMinPlaces = courseNames.map((courseName, index) => Math.max(0, minPlaces[index] - this.countManualAffectation(courseName)));
        let autoMaxPlaces = courseNames.map((courseName, index) => Math.max(0, maxPlaces[index] - this.countManualAffectation(courseName)));

        let assignmentsAuto = undefined;

        try {
            // On lance l'algorithme sur tous ceux qui doivent être affectés automatiquement
            assignmentsAuto = MunkresApp.process(penalties, autoMinPlaces, autoMaxPlaces, wishMatrixAuto, interestMatrixAuto);
        } catch (e) {
            // S'il y a une erreur
            let students = [...this.state.students];

            // On efface le calcul en cours
            for (let studentId in students) {
                students[studentId] = {...students[studentId], result: "Erreur d'affectation"};
            }

            this.setState({students: students, isAffecting: false});
            this.showError(e.message);
            return;
        }

        let assignments = [];
        let students = [...this.state.students];

        // On écrit le résultat des affectations automatiques en retrouvant le studentId original
        for (let id in assignmentsAuto) {
            let studentId = wishMatrixAuto[id].studentId;
            assignments[studentId] = assignmentsAuto[id];
            students[studentId] = {...students[studentId], result: courseNames[assignmentsAuto[id]-1]};
        }

        // On fait les affectations manuelles
        for (let studentId in students) {
            if (students[studentId].affectationMode !== "Automatique")
            {
                assignments[studentId] = courseNames.indexOf(students[studentId].affectationMode)+1;
                students[studentId] = {...students[studentId], result: students[studentId].affectationMode};
            }
        }

        let statistics = MunkresApp.analyze_results(assignments, penalties, minPlaces, maxPlaces, wishMatrix, interestMatrix);

        this.setState({
            students: students,
            statistics: statistics,
            isAffecting: false
        });
    }

    loadState(e) {
        let reader = new FileReader();
        reader.onload = e => {
            let state = JSON.parse(e.target.result);
            state.columns = new Map(state.columns);
            state.courses = new Map(state.courses);
            this.setState(state);
        };
        reader.readAsText(e.target.files[0]);
    }

    saveState() {
        let state = {...this.state};
        state["columns"] = [...state["columns"]];
        state["courses"] = [...state["courses"]];
        let data = JSON.stringify(state);
        fileDownload(data, 'state.json');
    }

    showError(message) {
        this.setState({errorShown: true, errorMessage: message});
    }

    hideError() {
        this.setState({errorShown: false});
    }

    editRow(row) {
        let students = [...this.state.students];
        students[row.id] = row;
        if (row.affectationMode !== "Automatique") {
            let courseName = row.affectationMode;
            let course = this.state.courses.get(courseName);
            let count = course.reservedPlaces;
            for (let studentId in students) {
                if (this.state.students[studentId].affectationMode === courseName)
                    count++;
            }

            if (course.maxPlaces < count) {
                this.showError("Il n'y a pas assez de place dans le cours « " + courseName + " » pour cette affectation manuelle.\n" +
                    "Une place a donc été rajoutée automatiquement.");

                let courses = new Map(this.state.courses);
                courses.set(courseName, {...course, maxPlaces: count});
                this.setState({courses: courses});
            }

        }

        this.setState({students: students});
    }

    render() {
        return (
            <>

                <Container fluid={true}>
                    <Jumbotron>
                        <input type="file" id="file" ref="loadStateInput" style={{display: "none"}} onChange={e => this.loadState(e)} />
                        <Button className="btn-primary float-right"
                                onClick={() => this.saveState()}
                                disabled={this.state.isAffecting}>
                            Enregistrer
                        </Button>
                        <Button className="btn-primary float-right mr-2"
                                onClick={() => this.refs.loadStateInput.click()}
                                disabled={this.state.isAffecting}>
                            Charger
                        </Button>

                        <h1>Ventilation</h1>
                        <hr/>
                        <CSVReader
                            cssClass="csv-reader-input"
                            label={<span className="mr-1">Fichier CSV à charger : </span>}
                            onFileLoaded={this.loadData.bind(this)}
                            onError={this.handleDataError}
                            parserOptions={{header: true,
                                            skipEmptyLines: true,
                                            transformHeader: dataHandler.sanitizeColumnName}}
                            inputId="limeSurvey"
                            disabled={this.state.isAffecting}
                        />
                    </Jumbotron>

                    {this.state.students.length !== 0 &&
                        <>
                            <Row>
                                <Col sm="8">
                                    <Columns wishCount={this.state.wishCount}
                                             courses={this.state.courses}
                                             columns={this.state.columns}
                                             changeMode={this.changeColumnMode.bind(this)}
                                             changeWishNum={this.changeColumnWishNum.bind(this)}
                                             changeAppealNum={this.changeColumnAppealNum.bind(this)}/>
                                </Col>
                                <Col sm="4">
                                    <Courses courses={this.state.courses}
                                             changePlaces={this.changePlaces.bind(this)}/>
                                </Col>
                            </Row>
                            <hr/>
                            <Row>
                                <Col sm="8">
                                    <Summary studentCount={this.state.students.length}
                                             minPlaces={this.getTotalMinPlaces()}
                                             maxPlaces={this.getTotalMaxPlaces()}
                                             reservedPlaces={this.getTotalReservedPlaces()}
                                             autoMinPlaces={this.getAutoMinPlaces()}
                                             autoMaxPlaces={this.getAutoMaxPlaces()}
                                             manualStudentCount={this.getTotalManualAffectations()}/>
                                </Col>
                            </Row>
                            <hr/>
                            <Affectations students={this.state.students}
                                          rtColumns={this.state.rtColumns}
                                          isAffecting={this.state.isAffecting}
                                          seed={this.state.seed}
                                          affect={this.affect.bind(this)}
                                          changeSeed={this.changeSeed.bind(this)}
                                          editRow={this.editRow.bind(this)}/>
                            {
                                this.state.statistics &&
                                <>
                                    <hr/>
                                    <Statistics statistics={this.state.statistics}
                                                courses={this.state.courses}/>
                                </>
                            }
                        </>
                    }
                </Container>

                <Modal show={this.state.errorShown} onHide={this.hideError.bind(this)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Une erreur est survenue...</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        <p>{this.state.errorMessage}</p>
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="primary" onClick={this.hideError.bind(this)}>Fermer</Button>
                    </Modal.Footer>
                </Modal>

            </>
        );
    }
}

export default App;
