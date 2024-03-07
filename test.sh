#!/bin/bash

# Function to expand the given identifier to potentially multiple experiment identifiers
expand_identifier() {
    identifier="$1"
    regex="^([A-Z]+)[0-9]+$"
    if [[ $identifier =~ $regex ]]; then
        prefix="${BASH_REMATCH[1]}"
        case $prefix in
            GSM)
                gsm_to_srx "$identifier"
                ;;
            GDS|GSE)
                gse_to_srx "$identifier"
                ;;
            DR*|SR*|ER*|PRJ*|SAM*)
                id_to_srx "$identifier"
                ;;
            *)
                echo "$identifier"
                ;;
        esac
    else
        echo "$identifier"
    fi
}

# Function to resolve the identifier to SRA experiments
id_to_srx() {
    identifier="$1"
    db="sra"
    case $identifier in 
        SAM*)
            db="biosample"
            ;;
        PRJ*)
            db="bioproject"
            ;;
    esac
    params="id=$identifier&db=$db&rettype=runinfo&retmode=xml"
    response=$(curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?$params")
    content_check "$response" "$identifier"
    while IFS=, read -r experiment _; do
        echo "$experiment"
    done <<< "$response"
}

# Function to resolve the GEO identifier to SRA experiments
gsm_to_srx() {
    identifier="$1"
    ids=()
    params="term=$identifier&db=sra&retmode=json"
    response=$(curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?$params")
    content_check "$response" "$identifier"
    gsm_ids=$(echo "$response" | jq -r '.esearchresult.idlist[]')
    for gsm_id in $gsm_ids; do
        ids+=( $(id_to_srx "$gsm_id") )
    done
    printf '%s\n' "${ids[@]}"
}

# Function to resolve the GSE identifier to GEO UIDs
gse_to_srx() {
    identifier="$1"
    ids=()
    params="term=$identifier&db=gds&retmode=json"
    response=$(curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?$params")
    content_check "$response" "$identifier"
    gds_uids=$(echo "$response" | jq -r '.esearchresult.idlist[]')
    for gds_uid in $gds_uids; do
        ids+=( $(gds_to_gsm "$gds_uid") )
    done
    printf '%s\n' "${ids[@]}"
}

# Function to resolve the GEO UIDs to GSM IDs to then resolve to SRA IDs
gds_to_gsm() {
    identifier="$1"
    ids=()
    params="id=$identifier&db=gds&retmode=json&retmax=10"
    response=$(curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?$params")
    content_check "$response" "$identifier"
    while IFS= read -r accesssion; do
        ids+=( $(gsm_to_srx "$accesssion") )
    done < <(echo "$response" | jq -r '.result."'$identifier'".samples[].accession')
    printf '%s\n' "${ids[@]}"
}

# Function to check that the response has content or terminate
content_check() {
    response="$1"
    identifier="$2"
    if [[ -z "$response" ]]; then
        echo "There is no content for id $identifier!" >&2
        exit 1
    fi
}

# Test the function with an identifier
expand_identifier "$1"
